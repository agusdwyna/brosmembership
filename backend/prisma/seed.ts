import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEFAULT_ROLES } from '../src/lib/permissions';

const prisma = new PrismaClient();

// Seed credentials come from the environment. The old hardcoded defaults were
// a footgun: whichever machine ran `db:seed` ended up with a known admin login.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@bros.local';
const OFFICER_EMAIL = process.env.SEED_OFFICER_EMAIL || 'officer@bros.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const OFFICER_PASSWORD = process.env.SEED_OFFICER_PASSWORD || 'officer123';

/**
 * Marker row proving this database was already seeded. It lives in the database
 * (not the container), so rebuilding or redeploying cannot bring back companies
 * or accounts the operator deleted. `SEED_FORCE=true` re-runs the seed anyway,
 * e.g. to sync built-in role permissions after a release.
 */
const SEED_MARKER_KEY = 'seed.version';
const SEED_VERSION = '1';

async function main() {
  console.log('🌱 Seeding database...');

  const isProduction = process.env.NODE_ENV === 'production';
  const force = process.env.SEED_FORCE === 'true';

  if (!force) {
    const marker = await prisma.setting.findUnique({ where: { key: SEED_MARKER_KEY } });
    if (marker) {
      console.log(`↷ Seed dilewati — database sudah di-seed (${marker.value}).`);
      console.log('  Set SEED_FORCE=true bila memang ingin menjalankannya lagi.');
      return;
    }
  }

  // Only the admin password is mandatory: without it there is no way to log in.
  if (isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_PASSWORD wajib diisi saat seeding di production.');
  }

  // The officer account is optional. Create it only when a password was
  // provided (or in development, where the fallback below applies). A missing
  // SEED_OFFICER_PASSWORD must not abort the whole seed — the admin account is
  // enough to boot and create officers later from the UI.
  const createOfficer = !isProduction || Boolean(process.env.SEED_OFFICER_PASSWORD);

  // 1. Create admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: 'Admin BROs',
      role: 'IT_GOD',
    },
  });
  console.log(`  ✓ User: ${admin.email}`);

  // 2. Create officer user (optional — see createOfficer above)
  if (createOfficer) {
    const officerHash = await bcrypt.hash(OFFICER_PASSWORD, 10);
    const officer = await prisma.user.upsert({
      where: { email: OFFICER_EMAIL },
      update: {},
      create: {
        email: OFFICER_EMAIL,
        passwordHash: officerHash,
        name: 'Officer BROs',
        role: 'OFFICER',
      },
    });
    console.log(`  ✓ User: ${officer.email}`);
  } else {
    console.log('  ↷ Officer dilewati (SEED_OFFICER_PASSWORD tidak diisi).');
  }

  // 3. Seed built-in roles. System roles are code-owned, so re-seeding keeps
  // their label/permissions in sync; custom roles made in the UI are untouched.
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        label: role.label,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
      create: {
        key: role.key,
        label: role.label,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
    });
    console.log(`  ✓ Role: ${role.key} (${role.permissions.length} permission)`);
  }

  // 4. Create the default card template once. `create` on every re-seed used to
  // add another duplicate template, so reuse an existing one by name.
  const template =
    (await prisma.cardTemplate.findFirst({ where: { name: 'BROs Default Card' } })) ??
    (await prisma.cardTemplate.create({
      data: {
        name: 'BROs Default Card',
        sides: {
          create: [
            {
              side: 'FRONT',
              elements: {
                create: [
                  { type: 'MEMBER_NAME', x: 20, y: 120, width: 260, height: 30, fontSize: 16, fontWeight: 'bold', alignment: 'left' },
                  { type: 'MEMBER_NUMBER', x: 20, y: 155, width: 260, height: 20, fontSize: 12, fontWeight: 'normal', alignment: 'left' },
                  { type: 'MEMBERSHIP_NAME', x: 20, y: 180, width: 260, height: 20, fontSize: 14, fontWeight: 'bold', alignment: 'left' },
                  { type: 'EXPIRY_DATE', x: 20, y: 210, width: 260, height: 20, fontSize: 11, fontWeight: 'normal', alignment: 'left' },
                ],
              },
            },
            {
              side: 'BACK',
              elements: {
                create: [
                  { type: 'QR_CODE', x: 160, y: 20, width: 80, height: 80 },
                ],
              },
            },
          ],
        },
      },
    }));
  console.log(`  ✓ Card Template: ${template.name}`);

  // 5. Create membership types
  const silver = await prisma.membershipType.upsert({
    where: { code: 'SILVER' },
    update: {},
    create: {
      code: 'SILVER',
      name: 'Silver Membership',
      description: 'Membership dasar dengan manfaat standar',
      duration: 365,
      defaultCardTemplateId: template.id,
    },
  });
  console.log(`  ✓ Membership Type: ${silver.name}`);

  const gold = await prisma.membershipType.upsert({
    where: { code: 'GOLD' },
    update: {},
    create: {
      code: 'GOLD',
      name: 'Gold Membership',
      description: 'Membership premium dengan manfaat lebih',
      duration: 365,
      defaultCardTemplateId: template.id,
    },
  });
  console.log(`  ✓ Membership Type: ${gold.name}`);

  const platinum = await prisma.membershipType.upsert({
    where: { code: 'PLATINUM' },
    update: {},
    create: {
      code: 'PLATINUM',
      name: 'Platinum Membership',
      description: 'Membership eksklusif dengan semua manfaat',
      duration: 730,
      defaultCardTemplateId: template.id,
    },
  });
  console.log(`  ✓ Membership Type: ${platinum.name}`);

  // 6. Create companies
  const brosCompany = await prisma.company.upsert({
    where: { code: 'BROS' },
    update: {},
    create: {
      code: 'BROS',
      name: 'BROs Hospital',
      address: 'Jl. Kesehatan No. 1, Jakarta',
      phone: '021-1234567',
      email: 'info@bros.co.id',
    },
  });
  console.log(`  ✓ Company: ${brosCompany.name}`);

  const partnerCompany = await prisma.company.upsert({
    where: { code: 'MITRA' },
    update: {},
    create: {
      code: 'MITRA',
      name: 'Mitra Sejahtera',
      address: 'Jl. Industri No. 8, Bandung',
      phone: '022-7654321',
      email: 'hrd@mitra.co.id',
    },
  });
  console.log(`  ✓ Company: ${partnerCompany.name}`);

  // 7. Default application settings. upsert keeps existing values on re-seed,
  // so an operator's configured brand/prefix is never overwritten.
  const defaultSettings: Record<string, string> = {
    brandName: 'Bros Membership',
    defaultScannerMethod: 'MANUAL',
    memberNumberPrefix: '',
    memberNumberReset: 'MONTHLY',
    cardNumberPrefix: 'CARD-',
    cardNumberReset: 'GLOBAL',
    expiringSoonDays: '30',
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`  ✓ Settings: ${Object.keys(defaultSettings).length} defaults`);

  // Written LAST: a seed that failed halfway must be retried on the next start,
  // otherwise the database would be marked done while still incomplete.
  await prisma.setting.upsert({
    where: { key: SEED_MARKER_KEY },
    update: { value: SEED_VERSION },
    create: { key: SEED_MARKER_KEY, value: SEED_VERSION },
  });
  console.log(`  ✓ Seed marker: ${SEED_MARKER_KEY}=${SEED_VERSION}`);

  console.log('✅ Seed completed!');
  console.log('');
  console.log(
    createOfficer
      ? `Users seeded: ${ADMIN_EMAIL} (IT_GOD), ${OFFICER_EMAIL} (OFFICER)`
      : `Users seeded: ${ADMIN_EMAIL} (IT_GOD)`,
  );
  console.log('Passwords diambil dari SEED_ADMIN_PASSWORD / SEED_OFFICER_PASSWORD — tidak dicetak.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
