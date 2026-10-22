/**
 * One-off data task: move every member of one company onto a membership type
 * and force a fixed period on their memberships.
 *
 * DRY-RUN BY DEFAULT. It prints exactly what it would change and exits; nothing
 * is written until it is re-run with --apply.
 *
 *   npx tsx prisma/retag-company-members.ts --company BK --type "SILVER ACCESS" \
 *     --start 2026-10-13 --end 2026-11-17
 *
 *   add --apply        to write
 *   add --new-cards    to issue a NEW card per membership with the target type's
 *                      template; existing cards stay as history
 *   add --backup <csv> to dump the affected rows before writing
 *   add --db-host H --db-port P to point at a LAN/exposed instance (credentials
 *                      still come from DATABASE_URL, never the command line)
 *
 * Safety:
 *  - company and type are looked up by code/name and must exist;
 *  - every write happens in ONE transaction, so a failure changes nothing;
 *  - each touched membership gets an activity-log entry with the old and new
 *    values;
 *  - soft-deleted members are skipped unless --include-deleted is passed;
 *  - re-running is safe: a membership already on the target type and period is
 *    skipped, and a card already using the target template is not reissued.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { generateCardNumber } from '../src/lib/numbering';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (value: string | undefined, label: string): Date => {
  if (!value) throw new Error(`--${label} wajib diisi (YYYY-MM-DD)`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error(`--${label} harus YYYY-MM-DD`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    throw new Error(`--${label} bukan tanggal yang valid`);
  }
  return date;
};
const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ─── Database target ────────────────────────────────────
// Parse the URL once so --db-host/--db-port can redirect it without the
// password ever appearing in a command line or shell history.
{
  const fromFile = (() => {
    try {
      const text = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
      return /^DATABASE_URL=(.*)$/m.exec(text)?.[1]?.trim().replace(/^"|"$/g, '');
    } catch {
      return undefined;
    }
  })();
  const raw = process.env.DATABASE_URL || fromFile;
  if (!raw) throw new Error('DATABASE_URL tidak ditemukan (env atau backend/.env)');

  const url = new URL(raw);
  const host = arg('db-host');
  const port = arg('db-port');
  if (host) url.hostname = host;
  if (port) url.port = port;
  process.env.DATABASE_URL = url.toString();
  console.log(`DB      : ${url.hostname}:${url.port}/${url.pathname.replace(/^\//, '')}`);
}

const prisma = new PrismaClient();

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const companyCode = arg('company');
  const typeName = arg('type');
  const startDate = toDate(arg('start'), 'start');
  const endDate = toDate(arg('end'), 'end');
  const apply = has('apply');
  const newCards = has('new-cards');
  const includeDeleted = has('include-deleted');
  const backupPath = arg('backup');

  if (endDate <= startDate) throw new Error('Tanggal berakhir harus setelah tanggal mulai');
  if (!companyCode) throw new Error('--company wajib diisi');
  if (!typeName) throw new Error('--type wajib diisi');

  // Case-insensitive: codes are stored exactly as the operator typed them.
  const companies = await prisma.company.findMany();
  const company = companies.find((c) => c.code.toLowerCase() === companyCode.toLowerCase());
  if (!company) {
    throw new Error(
      `Company "${companyCode}" tidak ditemukan. Yang ada: ${companies.map((c) => `${c.code} (${c.name})`).join(', ')}`,
    );
  }

  const types = await prisma.membershipType.findMany();
  const target = types.find(
    (t) =>
      t.name.toLowerCase() === typeName.toLowerCase() ||
      t.code.toLowerCase() === typeName.toLowerCase(),
  );
  if (!target) {
    throw new Error(
      `Tipe "${typeName}" tidak ditemukan. Yang ada: ${types.map((t) => `${t.code}/${t.name}`).join(', ')}`,
    );
  }
  if (target.status !== 'ACTIVE')
    throw new Error(`Tipe "${target.name}" berstatus ${target.status}`);
  if (newCards && !target.defaultCardTemplateId) {
    throw new Error(`Tipe "${target.name}" belum punya template kartu default`);
  }

  const members = await prisma.member.findMany({
    where: { companyId: company.id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      memberships: {
        orderBy: { createdAt: 'desc' },
        include: { membershipType: true, cards: { orderBy: { createdAt: 'desc' } } },
      },
    },
    orderBy: { memberNumber: 'asc' },
  });

  const toChange = members.filter((m) => m.memberships.length > 0);
  const noMembership = members.filter((m) => m.memberships.length === 0);

  console.log(`Company : ${company.code} — ${company.name}`);
  console.log(`Target  : ${target.code} — ${target.name} (${target.duration} hari)`);
  console.log(`Period  : ${fmt(startDate)} → ${fmt(endDate)}`);
  console.log(
    `Mode    : ${apply ? 'APPLY (menulis)' : 'DRY-RUN (tidak menulis)'}${newCards ? ' + kartu baru, kartu lama disimpan' : ', kartu tidak diubah'}`,
  );
  console.log(
    `Member  : ${members.length} ditemukan, ${toChange.length} punya membership, ${noMembership.length} tanpa membership\n`,
  );

  if (noMembership.length) {
    console.log('Dilewati (belum punya membership sama sekali):');
    for (const m of noMembership) console.log(`  - ${m.memberNumber} ${m.fullName}`);
    console.log('');
  }

  const same = (m: (typeof toChange)[number]) => {
    const c = m.memberships[0];
    return (
      c.membershipTypeId === target.id &&
      iso(c.startDate) === iso(startDate) &&
      iso(c.endDate) === iso(endDate)
    );
  };
  const pending = toChange.filter((m) => !same(m));

  console.log('Rencana perubahan:');
  for (const m of toChange) {
    const c = m.memberships[0];
    console.log(
      `  ${same(m) ? '=' : '~'} ${m.memberNumber} ${m.fullName}: ` +
        `${c.membershipType.code} ${iso(c.startDate)}→${iso(c.endDate)} ` +
        `=> ${target.code} ${iso(startDate)}→${iso(endDate)}` +
        ` | kartu: ${c.cards.map((k) => k.cardNumber).join(',') || 'tidak ada'}`,
    );
  }
  console.log(`\n${pending.length} akan diubah, ${toChange.length - pending.length} sudah sesuai.`);

  // ─── Backup ───────────────────────────────────────────
  if (backupPath) {
    const header = [
      'memberId',
      'memberNumber',
      'fullName',
      'membershipId',
      'membershipTypeCode',
      'startDate',
      'endDate',
      'status',
      'cardId',
      'cardNumber',
      'cardTemplateId',
      'templateVersion',
      'issuedAt',
    ];
    const rows: string[][] = [];
    for (const m of toChange) {
      const c = m.memberships[0];
      if (c.cards.length === 0) {
        rows.push([
          m.id,
          m.memberNumber,
          m.fullName,
          c.id,
          c.membershipType.code,
          iso(c.startDate),
          iso(c.endDate),
          c.status,
          '',
          '',
          '',
          '',
          '',
        ]);
      }
      for (const k of c.cards) {
        rows.push([
          m.id,
          m.memberNumber,
          m.fullName,
          c.id,
          c.membershipType.code,
          iso(c.startDate),
          iso(c.endDate),
          c.status,
          k.id,
          k.cardNumber,
          k.cardTemplateId,
          String(k.templateVersion),
          k.issuedAt.toISOString(),
        ]);
      }
    }
    fs.mkdirSync(path.dirname(path.resolve(backupPath)), { recursive: true });
    fs.writeFileSync(
      backupPath,
      [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'),
      'utf8',
    );
    console.log(`\nBackup  : ${rows.length} baris → ${path.resolve(backupPath)}`);
  }

  if (!apply) {
    console.log('\nDRY-RUN selesai. Tidak ada data yang diubah.');
    console.log('Jalankan ulang dengan --apply untuk menerapkan.');
    return;
  }

  // Find an admin to attribute the log entries to.
  const actor = await prisma.user.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (!actor) throw new Error('Tidak ada user aktif untuk dicatat di activity log');

  const result = await prisma.$transaction(
    async (tx) => {
      let updated = 0;
      let skipped = 0;
      let issued = 0;

      const template = newCards
        ? await tx.cardTemplate.findUnique({ where: { id: target.defaultCardTemplateId! } })
        : null;
      if (newCards && !template) throw new Error('Template kartu tipe tujuan tidak ditemukan');

      for (const m of toChange) {
        // Latest membership only: older rows are history and keep their dates.
        const current = m.memberships[0];

        if (same(m)) {
          skipped++;
        } else {
          await tx.membership.update({
            where: { id: current.id },
            data: { membershipTypeId: target.id, startDate, endDate },
          });
          updated++;

          await tx.activityLog.create({
            data: {
              memberId: m.id,
              action: 'UPDATE_DATES',
              description: `Mass update: ${current.membershipType.code} ${fmt(current.startDate)}→${fmt(current.endDate)} => ${target.code} ${fmt(startDate)}→${fmt(endDate)}`,
              oldValue: `${current.membershipType.code} ${fmt(current.startDate)}→${fmt(current.endDate)}`,
              newValue: `${target.code} ${fmt(startDate)}→${fmt(endDate)}`,
              performedBy: actor.id,
            },
          });
        }

        if (template) {
          // Reissue only when the newest card does not already use the target
          // template, so a second --apply does not pile up cards.
          const newest = current.cards[0];
          if (!newest || newest.cardTemplateId !== template.id) {
            const card = await tx.membershipCard.create({
              data: {
                membershipId: current.id,
                cardNumber: await generateCardNumber(tx),
                cardTemplateId: template.id,
                templateVersion: template.version,
              },
            });
            issued++;
            await tx.activityLog.create({
              data: {
                memberId: m.id,
                action: 'REPLACE',
                description: `Kartu baru diterbitkan: ${card.cardNumber} (${target.name})`,
                oldValue: newest?.cardNumber ?? null,
                newValue: card.cardNumber,
                performedBy: actor.id,
              },
            });
          }
        }
      }

      return { updated, skipped, issued };
    },
    { timeout: 180_000 },
  );

  console.log(
    `\n✅ Selesai: ${result.updated} membership diubah, ${result.skipped} dilewati (sudah sesuai).`,
  );
  if (newCards) console.log(`   Kartu baru diterbitkan: ${result.issued} (kartu lama disimpan).`);
  console.log(`   Activity log dicatat atas nama ${actor.email}.`);
}

main()
  .catch((e) => {
    console.error('❌ Gagal:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
