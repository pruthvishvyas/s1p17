import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_goals_alerts(df, config):
    '''Phase 8C: goals and alerts'''
    CONFIG = config
    df_feat = df
    # PHASE 8C - GOAL & ALERT CONFIG | Outcome: MONITOR
    import os, json, datetime
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    TH = CONFIG['THRESH']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    d = df_feat
    gpath = CONFIG['CONFIG_DIR'] + 'goals.json'
    os.makedirs(CONFIG['CONFIG_DIR'], exist_ok=True)
    goals = json.loads(json.dumps(CONFIG['GOALS_DEFAULT']))
    if os.path.exists(gpath):   # preserve targets the client has already set
        try:
            old = json.load(open(gpath, encoding='utf-8'))
            for k, v in old.items():
                if k in goals and isinstance(v, dict) and v.get('value') is not None:
                    goals[k]['value'] = v['value']
        except Exception:
            pass
    with open(gpath, 'w', encoding='utf-8') as _f:
        json.dump(goals, _f, indent=2)
    with open(CONFIG['CONFIG_DIR'] + 'terminology.json', 'w', encoding='utf-8') as _f:
        json.dump(CONFIG['TERMINOLOGY'], _f, indent=2)
    def gv(k):
        return goals[k]['value']

    tot_out = float(d[C['OUTSTANDING']].sum()) or 1.0
    npl_mask = (d[C['DPD']] >= TH['DPD_NPL']) | (d[C['STAGE']] == 3)
    actual = {
        'npl_ratio_pct': 100 * float(d.loc[npl_mask, C['OUTSTANDING']].sum()) / tot_out,
        'stage2_share_pct': 100 * float(d.loc[d[C['STAGE']] == 2, C['OUTSTANDING']].sum()) / tot_out,
        'ever_90dpd_rate_pct': 100 * float(d[C['TARGET']].mean()),
    }
    dts = pd.to_datetime(d[C['DATE']], errors='coerce')
    cutoff = dts.max() - pd.DateOffset(months=3)
    rec = dts > cutoff
    actual['high_dti_share_recent_pct'] = 100 * float((d.loc[rec, C['DTI_POST']] > TH['DTI_MAX']).mean()) if rec.any() else 0.0
    hist_bad = float(d.loc[~rec, C['TARGET']].mean()) if (~rec).any() else 0.0
    rec_bad = float(d.loc[rec, C['TARGET']].mean()) if rec.any() else 0.0
    actual['vintage_bad_rate_change_pct'] = 100 * (rec_bad - hist_bad) / hist_bad if hist_bad > 0 else 0.0
    fc_drop = 0.0
    try:
        fc = pd.read_csv(CONFIG['PROCESSED_DIR'] + 'forecast_output.csv')
        h = fc[(fc.metric == 'loans') & (fc.kind == 'history')]['actual'].tail(3)
        f = fc[(fc.metric == 'loans') & (fc.kind == 'forecast')]['forecast']
        if len(h) and len(f) and h.mean() > 0:
            fc_drop = 100 * (h.mean() - f.mean()) / h.mean()
    except Exception:
        pass
    actual['forecast_origination_drop_pct'] = fc_drop
    try:
        neg_seg = int((pd.read_csv(CONFIG['PROCESSED_DIR'] + 'segment_profitability.csv')['net_profit'] < 0).sum())
    except Exception:
        neg_seg = 0
    actual['loss_making_segments'] = neg_seg

    alerts = []
    def _alert(sev, metric, val, thr, msg, action):
        alerts.append({'severity': sev, 'metric': metric, 'actual': round(float(val), 3), 'threshold': thr, 'message': msg, 'action': action, 'outcome': 'MONITOR'})
    if actual['npl_ratio_pct'] > gv('alert_npl_ratio_pct'):
        _alert('HIGH', 'npl_ratio_pct', actual['npl_ratio_pct'], gv('alert_npl_ratio_pct'), 'Non-performing balance is above tolerance', 'Prioritise workout and tighten approvals this month')
    if actual['stage2_share_pct'] > gv('alert_stage2_share_pct'):
        _alert('MEDIUM', 'stage2_share_pct', actual['stage2_share_pct'], gv('alert_stage2_share_pct'), 'Stage 2 (watch) balance is above tolerance', 'Launch early-intervention campaign on the watchlist')
    if actual['high_dti_share_recent_pct'] > gv('alert_high_dti_share_pct'):
        _alert('MEDIUM', 'high_dti_share_recent_pct', actual['high_dti_share_recent_pct'], gv('alert_high_dti_share_pct'), 'Recent originations breach the DTI cap too often', 'Enforce hard DTI cap in underwriting')
    if actual['vintage_bad_rate_change_pct'] > gv('alert_vintage_bad_rate_increase_pct'):
        _alert('HIGH', 'vintage_bad_rate_change_pct', actual['vintage_bad_rate_change_pct'], gv('alert_vintage_bad_rate_increase_pct'), 'Recent vintages are performing worse than history', 'Review recent channel/product mix and cutoffs')
    if actual['forecast_origination_drop_pct'] > gv('alert_drop_pct'):
        _alert('MEDIUM', 'forecast_origination_drop_pct', actual['forecast_origination_drop_pct'], gv('alert_drop_pct'), 'Originations are forecast to drop', 'Review marketing spend and pricing')
    if neg_seg > 0:
        _alert('MEDIUM', 'loss_making_segments', neg_seg, 0, 'Some product/grade segments have negative net profit', 'Reprice or stop lending in these segments')
    progress = []
    def _prog(key, act, higher_is_worse=True):
        t = gv(key) if key in goals else None
        if t is None:
            st = 'NOT_SET'
        else:
            st = ('ON_TRACK' if act <= t else 'OFF_TRACK') if higher_is_worse else ('ON_TRACK' if act >= t else 'OFF_TRACK')
        progress.append({'goal': key, 'actual': round(float(act), 3), 'target': t, 'status': st})
    _prog('alert_npl_ratio_pct', actual['npl_ratio_pct'])
    _prog('alert_stage2_share_pct', actual['stage2_share_pct'])
    _prog('alert_high_dti_share_pct', actual['high_dti_share_recent_pct'])
    _prog('ever_90dpd_rate_target', actual['ever_90dpd_rate_pct'])
    _m = d.assign(_m=dts.dt.to_period('M')).groupby('_m').size()
    _prog('monthly_origination_target', float(_m.tail(3).mean()) if len(_m) else 0.0, higher_is_worse=False)
    with open(CONFIG['PROCESSED_DIR'] + 'alerts.json', 'w', encoding='utf-8') as _f:
        json.dump({'generated_at': datetime.datetime.now().isoformat(), 'alerts': alerts}, _f, indent=2)
    with open(CONFIG['PROCESSED_DIR'] + 'goal_progress.json', 'w', encoding='utf-8') as _f:
        json.dump({'generated_at': datetime.datetime.now().isoformat(), 'actuals': {k: round(float(v), 4) for k, v in actual.items()}, 'goals': progress}, _f, indent=2)
    print('Alerts:', len(alerts)); [print(' -', a['severity'], a['metric'], a['actual']) for a in alerts]
    return None
