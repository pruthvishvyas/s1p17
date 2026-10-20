import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def export(df, config):
    '''Phase 10: Excel and dashboard'''
    CONFIG = config
    df_feat = df
    # PHASE 10 - EXPORT & REPORTING | Outcome: UNDERSTAND + DECIDE + MONITOR
    import json
    import numpy as np, pandas as pd
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    C = CONFIG['COLS']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    d = df_feat
    fig = make_subplots(rows=2, cols=2, subplot_titles=('Bad rate by risk grade (%)', 'Composite risk score', 'Credit score vs post-loan DTI', 'Loans by action priority'))
    gr = (d.groupby(C['GRADE'])[C['TARGET']].mean() * 100).sort_index()
    fig.add_trace(go.Bar(x=gr.index.astype(str), y=gr.values, name='Bad rate %'), row=1, col=1)
    for _v in [0, 1]:
        fig.add_trace(go.Histogram(x=d.loc[d[C['TARGET']] == _v, 'composite_risk_score'], opacity=0.6, name=CONFIG['TARGET_LABELS'][_v]), row=1, col=2)
    _s = d.sample(min(3000, len(d)), random_state=CONFIG['RANDOM_STATE'])
    fig.add_trace(go.Scatter(x=_s[C['SCORE']], y=_s[C['DTI_POST']], mode='markers', marker=dict(size=4, color=_s[C['TARGET']], colorscale='RdYlGn_r'), name='Loans'), row=2, col=1)
    if 'priority' in d.columns:
        pv = d['priority'].value_counts().sort_index()
        fig.add_trace(go.Bar(x=pv.index, y=pv.values, name='Priority'), row=2, col=2)
    fig.update_layout(height=800, barmode='overlay', title_text=CONFIG['PROJECT_NAME'])
    fig.write_html(CONFIG['REPORTS_DIR'] + 'interactive_dashboard.html')

    npl = (d[C['DPD']] >= CONFIG['THRESH']['DPD_NPL']) | (d[C['STAGE']] == 3)
    kpi = pd.DataFrame([
        ['Total loans', int(len(d))], ['Outstanding principal', round(float(d[C['OUTSTANDING']].sum()), 2)],
        ['Ever 90+ DPD rate %', round(100 * float(d[C['TARGET']].mean()), 3)],
        ['NPL ratio % of balance', round(100 * float(d.loc[npl, C['OUTSTANDING']].sum()) / (float(d[C['OUTSTANDING']].sum()) or 1), 3)],
        ['Interest income', round(float(d[C['INT_INC']].sum()), 2)], ['Fee income', round(float(d[C['FEE_INC']].sum()), 2)],
        ['Funding cost', round(float(d[C['FUND_COST']].sum()), 2)], ['Net loss', round(float(d[C['NET_LOSS']].sum()), 2)],
        ['Net profit to date', round(float(d[C['PROFIT']].sum()), 2)], ['Expected loss', round(float(d[C['EL']].sum()), 2)],
        ['Average credit score', round(float(d[C['SCORE']].mean()), 1)]], columns=['Metric', 'Value'])
    def _rd(p):
        try:
            return pd.read_csv(CONFIG['PROCESSED_DIR'] + p)
        except Exception:
            return pd.DataFrame()
    segs = d.groupby('risk_segment').agg(loans=(C['ID'], 'size'), bad_rate=(C['TARGET'], 'mean'), outstanding=(C['OUTSTANDING'], 'sum'), net_profit=(C['PROFIT'], 'sum')).reset_index() if 'risk_segment' in d.columns else pd.DataFrame()
    coll = _rd('business_logic_output.csv').head(5000)
    xl = CONFIG['REPORTS_DIR'] + CONFIG['CLIENT_ID'] + '_report.xlsx'
    with pd.ExcelWriter(xl, engine='openpyxl') as w:
        kpi.to_excel(w, sheet_name='Portfolio Summary', index=False)
        segs.to_excel(w, sheet_name='Risk Segments', index=False)
        _rd('segment_profitability.csv').to_excel(w, sheet_name='Product Profitability', index=False)
        coll.to_excel(w, sheet_name='Collections List', index=False)
        _rd('forecast_output.csv').to_excel(w, sheet_name='Origination Forecast', index=False)
        d.head(200000).to_excel(w, sheet_name='Full Dataset', index=False)
    print('=' * 60)
    print('PORTFOLIO SUMMARY  |  loans: %d  |  ever-90DPD: %.2f%%' % (len(d), 100 * d[C['TARGET']].mean()))
    print('Outstanding: %.0f  |  net profit: %.0f' % (d[C['OUTSTANDING']].sum(), d[C['PROFIT']].sum()))
    print('Anomalies: %d  |  P1 urgent: %d' % (int(d['is_anomaly'].sum()) if 'is_anomaly' in d.columns else 0, int((d['priority'] == 'P1_URGENT').sum()) if 'priority' in d.columns else 0))
    print('Excel:', xl)
    print('=' * 60)
    return None
