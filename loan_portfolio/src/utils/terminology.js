import { goalStatus } from './formatters';

export const REC_META = {
  NPL_WORKOUT: { label: 'Recover badly overdue loans', when: 'Now', why: 'These loans are 90+ days late or impaired.', impact: 'Recovers cash and keeps provisioning accurate.' },
  COLLECT_NOW: { label: 'Call overdue borrowers', when: 'This week', why: 'Loans 30-89 days late roll into default quickly if ignored.', impact: 'Stops them sliding into non-performing.' },
  EARLY_WARNING: { label: 'Reach out before they miss payments', when: 'This week', why: 'Still paying, but the early-warning model rates them among the riskiest 10%.', impact: 'Cheapest point to prevent a loss.' },
  STAGE_MISMATCH: { label: 'Re-check loan staging', when: 'This month', why: 'Classified as healthy but behave like risky loans.', impact: 'Avoids under-provisioning.' },
  UNPROFITABLE: { label: 'Fix loss-making loans', when: 'This month', why: 'Aged 12+ months and still losing money.', impact: 'Cut servicing cost or refinance.' },
  PRICING_GAP: { label: 'Reprice or tighten approval', when: 'This month', why: 'Interest margin is lower than the expected loss.', impact: 'Stops lending below cost.' },
  HIGH_DTI: { label: 'Cap borrower debt load', when: 'Next policy review', why: 'Borrowers above the debt-to-income limit default more often.', impact: 'Lowers future defaults.' }
};

export const GOAL_META = {
  ever_90dpd_rate_target: { label: 'Target: loans ever 90+ days late', unit: '%', higherIsWorse: true, help: 'The maximum share of loans you are comfortable seeing go 3+ months late.' },
  monthly_origination_target: { label: 'Target: new loans per month', unit: 'loans', higherIsWorse: false, help: 'How many new loans you want to write each month.' },
  alert_npl_ratio_pct: { label: 'Limit: non-performing balance', unit: '%', higherIsWorse: true, help: 'You are alerted when badly overdue money exceeds this share of the book.' },
  alert_stage2_share_pct: { label: 'Limit: watchlist (Stage 2) balance', unit: '%', higherIsWorse: true, help: 'Alert when early-stress loans exceed this share of the book.' },
  alert_high_dti_share_pct: { label: 'Limit: recent loans above debt cap', unit: '%', higherIsWorse: true, help: 'Alert when too many new loans exceed the debt-to-income cap.' },
  alert_vintage_bad_rate_increase_pct: { label: 'Limit: worsening of new loan quality', unit: '%', higherIsWorse: true, help: 'Alert when recent loans are this much worse than older ones.' },
  alert_drop_pct: { label: 'Limit: drop in new lending', unit: '%', higherIsWorse: true, help: 'Alert when forecast new loans fall by more than this.' },
  forecast_horizon: { label: 'Forecast horizon', unit: 'months', higherIsWorse: false, help: 'How far ahead the forecast looks.' }
};

export const ALERT_LABELS = {
  npl_ratio_pct: 'Non-performing balance', stage2_share_pct: 'Watchlist balance', high_dti_share_recent_pct: 'Recent loans above debt cap',
  vintage_bad_rate_change_pct: 'New loan quality', forecast_origination_drop_pct: 'Forecast drop in new lending', loss_making_segments: 'Loss-making segments'
};

export const GLOSSARY = [
  ['Ever 90+ days late', 'A loan that has, at any point, been three months or more behind on payments.'],
  ['Non-performing (NPL)', 'Money owed on loans that are badly overdue or officially impaired.'],
  ['Watchlist (Stage 2)', 'Loans showing early signs of stress - not yet defaulted, but worth watching.'],
  ['Impaired (Stage 3)', 'Loans considered unlikely to be repaid in full.'],
  ['Debt-to-income (DTI)', 'Monthly debt payments as a share of monthly income. Higher means a heavier burden for the borrower.'],
  ['Credit score', 'A number from 300 to 850 summarising how reliably someone has repaid debt. Higher is safer.'],
  ['Risk grade', 'A letter (A best to E weakest) that groups borrowers by how risky they were at approval.'],
  ['Unusual loan (anomaly)', 'A loan whose mix of risk and price does not look like the rest of your book.'],
  ['Risk score', 'A 0-100 summary of how risky a loan looked at approval. Higher is riskier.'],
  ['Early-warning model', 'A model that scores every loan on its chance of going 3+ months late.'],
  ['Early-warning accuracy', 'How well the model tells good loans from bad ones. 1.0 is perfect; 0.5 is guessing.'],
  ['Forecast', 'Our prediction of future new lending based on past patterns.'],
  ['Forecast error', 'How far off the forecast was, on average, when tested on recent months.'],
  ['Vintage', 'All loans started in the same month. Comparing vintages shows whether new lending is getting better or worse.'],
  ['Margin after expected losses', 'Interest rate minus funding cost minus the loss you expect. Below zero means the loan is under-priced.'],
  ['Net profit', 'Interest and fees earned, minus funding, servicing, acquisition costs and losses.'],
  ['Expected loss', 'The amount the models expect you to lose on loans that go bad.'],
  ['Watchlist call list', 'Current loans the model rates among your riskiest 10% - contact them before they miss a payment.']
];

export { goalStatus };
