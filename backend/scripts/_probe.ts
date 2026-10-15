import { memberService } from '../src/modules/members/service';

async function main() {
  const members = await memberService.list();
  console.log('members via service:', members.length);
  for (const m of members) {
    const ms = m.memberships?.[0];
    const card = ms?.cards?.[0];
    console.log(`\n${m.memberNumber} ${m.fullName}`);
    console.log('  membership:', !!ms, '| card:', !!card, '| cardTemplate:', !!card?.cardTemplate);
    if (card?.cardTemplate) {
      for (const s of card.cardTemplate.sides) {
        console.log(
          `    ${s.side}: designUrl=${s.designUrl ? 'yes' : 'no'} elements=${s.elements?.length ?? 'UNDEFINED'}`,
        );
        console.log('      raw:', JSON.stringify(s.elements));
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('ERR', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
