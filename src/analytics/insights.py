import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_insights(df, config):
    '''Phase 9: insights'''
    CONFIG = config
    df_feat = df
    # PHASE 9 - INSIGHTS ENGINE | Outcome: DECIDE
    import json, os
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    TH = CONFIG['THRESH']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    d = df_feat
    base = float(d[C['TARGET']].mean())
    tot_out = float(d[C['OUTSTANDING']].sum()) or 1.0
    insights = []
    def add_insight(category, finding, evidence, action, severity):
        insights.append({'severity': severity, 'category': category, 'finding': finding, 'evidence': evidence, 'action': action, 'outcome': 'DECIDE'})
    def sev(v, hi, med):
        return 'HIGH' if v >= hi else ('MEDIUM' if v >= med else 'LOW')
    try:
        M = json.load(open(CONFIG['MODELS_DIR'] + 'metrics.json', encoding='utf-8'))
    except Exception:
        M = {}
    npl = (d[C['DPD']] >= TH['DPD_NPL']) | (d[C['STAGE']] == 3)
    npl_ratio = 100 * float(d.loc[npl, C['OUTSTANDING']].sum()) / tot_out
    add_insight('Portfolio Health', 'Share of the book that is non-performing (90+ DPD or Stage 3)',
                'NPL balance %.2f%% of outstanding principal; %.2f%% of all loans have ever reached 90+ DPD' % (npl_ratio, 100 * base),
                'Set a recovery target for Stage 3 loans and review underwriting if NPL exceeds 5%', sev(npl_ratio, 5, 3))
    g = d.groupby([C['PRODUCT'], C['GRADE']]).agg(n=(C['ID'], 'size'), br=(C['TARGET'], 'mean'), prof=(C[ 'PROFIT'], 'sum'), out=(C['OUTSTANDING'], 'sum')).reset_index()
    g = g[g['n'] >= TH['MIN_SEGMENT_LOANS']]
    if len(g):
        w = g.sort_values('br', ascending=False).iloc[0]
        mult = float(w['br'] / base) if base > 0 else 0
        add_insight('Credit Risk', 'Worst-performing product/grade segment: %s grade %s' % (w[C['PRODUCT']], w[C['GRADE']]),
                    'Bad rate %.1f%% vs %.1f%% portfolio (%.1fx) across %d loans and %.0f outstanding' % (100 * w['br'], 100 * base, mult, int(w['n']), w['out']),
                    'Tighten cutoffs or raise price for this segment this month', sev(mult, 2, 1.3))
        loss = g[g['prof'] < 0]
        add_insight('Pricing & Profitability', '%d product/grade segments have negative net profit' % len(loss),
                    'Total net profit %.0f; loss-making segments lose %.0f combined' % (d[C['PROFIT']].sum(), loss['prof'].sum()),
                    'Reprice or stop lending in the loss-making segments (see Product Profitability sheet)',
                    'HIGH' if (len(loss) and abs(loss['prof'].sum()) > 0.01 * abs(d[C['PROFIT']].sum() or 1)) else ('MEDIUM' if len(loss) else 'LOW'))
    sub = d[C['SCORE']] < TH['SCORE_SUBPRIME']
    if sub.any() and (~sub).any():
        r1, r0 = float(d.loc[sub, C['TARGET']].mean()), float(d.loc[~sub, C['TARGET']].mean())
        ratio = r1 / r0 if r0 > 0 else 0
        add_insight('Credit Risk', 'Subprime borrowers (score < %d) default far more often than prime' % TH['SCORE_SUBPRIME'],
                    'Bad rate %.1f%% vs %.1f%% (%.1fx); subprime is %.1f%% of loans' % (100 * r1, 100 * r0, ratio, 100 * sub.mean()),
                    'Use the score-cutoff simulator to test raising the minimum score', sev(ratio, 3, 1.5))
    hd = d[C['DTI_POST']] > TH['DTI_MAX']
    if hd.any() and (~hd).any():
        r1, r0 = float(d.loc[hd, C['TARGET']].mean()), float(d.loc[~hd, C['TARGET']].mean())
        ratio = r1 / r0 if r0 > 0 else 0
        add_insight('Origination Quality', 'Loans pushing post-loan DTI above %.0f%% are riskier' % TH['DTI_MAX'],
                    '%.1f%% of loans breach the cap; their bad rate is %.1f%% vs %.1f%% (%.1fx)' % (100 * hd.mean(), 100 * r1, 100 * r0, ratio),
                    'Enforce a hard DTI cap in underwriting or require compensating factors', sev(ratio, 2, 1.3))
    if 'loan_alerts' in d.columns:
        ew = d['loan_alerts'].str.contains('EARLY_WARNING')
        add_insight('Collections', '%d current loans carry top-decile model risk and are not yet delinquent' % int(ew.sum()),
                    'Outstanding at risk %.0f (%.1f%% of book); model flags them before they miss payments' % (d.loc[ew, C['OUTSTANDING']].sum(), 100 * d.loc[ew, C['OUTSTANDING']].sum() / tot_out),
                    'Contact this early-warning list this week (reminder, restructure, payment holiday)', 'HIGH' if ew.sum() > 0 else 'LOW')
        sm = d['loan_alerts'].str.contains('STAGE_MISMATCH')
        add_insight('Provisioning', '%d Stage 1 loans look like Stage 2 risk to the model' % int(sm.sum()),
                    'Stage 1 loans in the riskiest 5%% of model scores hold %.0f outstanding' % d.loc[sm, C['OUTSTANDING']].sum(),
                    'Review IFRS9 staging and provisioning for these loans', sev(100 * d.loc[sm, C['OUTSTANDING']].sum() / tot_out, 2, 0.5))
    ch = d.groupby(C['CHANNEL']).agg(n=(C['ID'], 'size'), br=(C['TARGET'], 'mean'), ppl=(C['PROFIT'], 'mean')).reset_index()
    ch = ch[ch['n'] >= TH['MIN_SEGMENT_LOANS']]
    if len(ch) >= 2:
        a, b = ch.sort_values('br').iloc[0], ch.sort_values('br').iloc[-1]
        add_insight('Channel Performance', 'Channel quality gap: %s is best, %s is worst' % (a[C['CHANNEL']], b[C['CHANNEL']]),
                    'Bad rate %.1f%% vs %.1f%%; profit per loan %.0f vs %.0f' % (100 * a['br'], 100 * b['br'], a['ppl'], b['ppl']),
                    'Shift acquisition spend toward the better channel or tighten criteria on the worse one', sev(float(b['br'] / a['br']) if a['br'] > 0 else 0, 2, 1.3))
    if 'classifier' in M:
        m = M['classifier']
        gap = m['test_auc'] - m['bank_pd_auc']
        add_insight('Model Performance', 'Our default model (%s) vs the bank Modelled PD' % m['name'],
                    'Hold-out AUC %.3f vs Modelled_PD %.3f; top 10%% of loans capture %.0f%% of bad loans; KS %.2f' % (m['test_auc'], m['bank_pd_auc'], 100 * m['top_decile_capture'], m['ks']),
                    'Adopt the new model for early warning' + (' and recalibrate Modelled PD' if gap > 0.02 else '; Modelled PD is competitive'), 'MEDIUM' if gap > 0.02 else 'LOW')
    if 'is_anomaly' in d.columns and d['is_anomaly'].sum() > 0:
        an = d['is_anomaly'] == 1
        add_insight('Underwriting Exceptions', '%d loans have unusual risk/price combinations' % int(an.sum()),
                    'Anomalous loans bad rate %.1f%% vs %.1f%% overall' % (100 * d.loc[an, C['TARGET']].mean(), 100 * base),
                    'Audit the approval trail of the highest anomaly scores', sev(float(d.loc[an, C['TARGET']].mean() / base) if base > 0 else 0, 2, 1.3))
    mo = d.assign(m=pd.to_datetime(d[C['DATE']], errors='coerce')).dropna(subset=['m'])
    if len(mo):
        cut = mo['m'].max() - pd.DateOffset(months=6)
        rb, hb = float(mo.loc[mo['m'] > cut, C['TARGET']].mean()), float(mo.loc[mo['m'] <= cut, C['TARGET']].mean())
        add_insight('Vintage Trend', 'Last 6 months of originations vs earlier vintages',
                    'Bad rate so far %.1f%% vs %.1f%% (recent loans have had less time to default)' % (100 * rb, 100 * hb),
                    'Track the vintage curve monthly; act early if recent vintages already exceed history', sev(100 * (rb - hb) / hb if hb > 0 else 0, 20, 5))
    _rank = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    insights = sorted(insights, key=lambda x: _rank[x['severity']])
    assert len(insights) >= 8, 'Fewer than 8 insights - data too thin'
    with open(CONFIG['REPORTS_DIR'] + 'insights.json', 'w', encoding='utf-8') as _f:
        json.dump(insights, _f, indent=2)
    for _i in insights:
        print('[%s] %s - %s' % (_i['severity'], _i['category'], _i['finding']))
    return None
