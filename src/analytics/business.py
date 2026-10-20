import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_business_logic(df, config):
    '''Phase 8: business logic'''
    CONFIG = config
    df_feat = df
    # PHASE 8 - BUSINESS LOGIC LAYER | Outcome: DECIDE
    import numpy as np, pandas as pd
    import matplotlib.pyplot as plt
    C = CONFIG['COLS']
    TH = CONFIG['THRESH']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    if 'pred_prob' not in df_feat.columns:
        df_feat['pred_prob'] = df_feat[C['PD']] / 100.0
    dpd = df_feat[C['DPD']]; stg = df_feat[C['STAGE']]; pp = df_feat['pred_prob']
    npl = (dpd >= TH['DPD_NPL']) | (stg == 3)
    cur = dpd < TH['DPD_COLLECT']
    thr_watch = float(pp[cur].quantile(TH['WATCH_QUANTILE'])) if cur.any() else 1.0
    thr_q95 = float(pp.quantile(0.95))
    MASKS = {
        'NPL_WORKOUT': npl,
        'COLLECT_NOW': (dpd >= TH['DPD_COLLECT']) & ~npl,
        'EARLY_WARNING': cur & ~npl & (pp >= thr_watch),
        'STAGE_MISMATCH': (stg == 1) & (pp >= thr_q95),
        'UNPROFITABLE': (df_feat[C['PROFIT']] < 0) & (df_feat[C['MOB']] >= TH['UNPROFITABLE_MIN_MOB']),
        'PRICING_GAP': df_feat['risk_adjusted_spread_pct'] < 0,
        'HIGH_DTI': df_feat[C['DTI_POST']] > TH['DTI_MAX'],
    }
    ACTIONS = {
        'NPL_WORKOUT': 'Move to workout/legal recovery and confirm Stage 3 provisioning',
        'COLLECT_NOW': 'Add to this week collections call list',
        'EARLY_WARNING': 'Proactive outreach: reminder, payment holiday or restructure before it rolls to 30+ DPD',
        'STAGE_MISMATCH': 'Review IFRS9 staging - model risk is far above the Stage 1 norm',
        'UNPROFITABLE': 'Review account: cut servicing cost or offer refinance',
        'PRICING_GAP': 'Reprice or tighten approval for this product/grade',
        'HIGH_DTI': 'Cap post-loan DTI at policy limit for new lending',
    }
    def assign_alerts(df):
        s = np.array([''] * len(df), dtype=object)
        for name, m in MASKS.items():
            s = np.where(m.values, np.where(s == '', name, s + '|' + name), s)
        return np.where(s == '', 'NORMAL', s)
    def priority_level(df):
        m = MASKS
        p1 = m['NPL_WORKOUT'] | m['COLLECT_NOW'] | (m['EARLY_WARNING'] & m['STAGE_MISMATCH'])
        p2 = m['EARLY_WARNING'] | m['STAGE_MISMATCH'] | m['UNPROFITABLE']
        p3 = m['PRICING_GAP'] | m['HIGH_DTI']
        return np.select([p1.values, p2.values, p3.values], ['P1_URGENT', 'P2_HIGH', 'P3_MEDIUM'], default='P4_ROUTINE')
    def recommend(df):
        s = np.array([''] * len(df), dtype=object)
        for name, m in MASKS.items():
            s = np.where(m.values, np.where(s == '', ACTIONS[name], s + '; ' + ACTIONS[name]), s)
        return np.where(s == '', 'No action - monitor', s)
    df_feat['loan_alerts'] = assign_alerts(df_feat)
    df_feat['priority'] = priority_level(df_feat)
    df_feat['recommendations'] = recommend(df_feat)
    print(df_feat['priority'].value_counts())
    print(df_feat.groupby('priority')[C['TARGET']].mean().round(4))
    print('Early-warning threshold (top decile of current loans): %.3f' % thr_watch)

    # segment profitability: product x grade
    base_bad = float(df_feat[C['TARGET']].mean())
    sp = df_feat.groupby([C['PRODUCT'], C['GRADE']]).agg(loans=(C['ID'], 'size'), bad_rate=(C['TARGET'], 'mean'), avg_rate=(C['RATE'], 'mean'),
                                                          outstanding=(C['OUTSTANDING'], 'sum'), net_profit=(C['PROFIT'], 'sum'),
                                                          expected_loss=(C['EL'], 'sum'), avg_risk_adj_spread=('risk_adjusted_spread_pct', 'mean')).reset_index()
    sp = sp[sp['loans'] >= TH['MIN_SEGMENT_LOANS']].copy()
    sp['profit_per_loan'] = sp['net_profit'] / sp['loans'].replace(0, 1)
    sp['segment_action'] = np.select([sp['net_profit'] < 0, sp['bad_rate'] > 1.5 * base_bad, sp['avg_risk_adj_spread'] < 0],
                                     ['Discontinue or reprice', 'Tighten approval', 'Reprice - margin below expected loss'], default='Maintain / grow')
    sp = sp.sort_values('net_profit')
    sp.to_csv(CONFIG['PROCESSED_DIR'] + 'segment_profitability.csv', index=False, encoding='utf-8')
    out_cols = [C['ID'], C['PRODUCT'], C['GRADE'], C['DPD'], C['STAGE'], C['OUTSTANDING'], 'pred_prob', 'loan_alerts', 'priority', 'recommendations']
    bl = df_feat[df_feat['loan_alerts'] != 'NORMAL'][out_cols].sort_values(['priority', C['OUTSTANDING']], ascending=[True, False])
    bl.to_csv(CONFIG['PROCESSED_DIR'] + 'business_logic_output.csv', index=False, encoding='utf-8')
    fig, ax = plt.subplots(figsize=(7, 4)); vc = df_feat['priority'].value_counts().sort_index()
    ax.bar(vc.index, vc.values, color=['#C00000', '#F0A30A', '#2E75B6', '#2E8B57'][:len(vc)]); ax.bar_label(ax.containers[0]); ax.set_title('Loans by action priority')
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'biz_01_priority.png', dpi=150); plt.show(); plt.close()
    df_feat.to_csv(CONFIG['FEAT_CSV'], index=False, encoding='utf-8')
    print('business_logic_output.csv rows:', len(bl))
    return df_feat
