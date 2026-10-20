import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_eda(df, config):
    '''Phase 4: EDA'''
    CONFIG = config
    df_feat = df
    # PHASE 4 - EDA (8 charts, each answers a named business question)
    import os, json
    import numpy as np, pandas as pd
    import matplotlib.pyplot as plt, seaborn as sns
    C = CONFIG['COLS']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    plt.rcParams.update({'figure.dpi': 150, 'axes.spines.top': False, 'axes.spines.right': False})
    T = C['TARGET']
    RD = CONFIG['REPORTS_DIR']
    d = df_feat
    def _save(name):
        plt.tight_layout(); plt.savefig(RD + name, dpi=150); plt.show(); plt.close()
    CHART_MAP = {
        'eda_01_bad_rate_by_grade.png': ['Which risk grades actually go 90+ DPD?', 'UNDERSTAND'],
        'eda_02_credit_score_by_outcome.png': ['Where does credit score separate good from bad loans?', 'UNDERSTAND'],
        'eda_03_correlation_heatmap.png': ['Which borrower/loan drivers move with delinquency and profit?', 'DECIDE'],
        'eda_04_product_channel_bad_rate.png': ['Which product and channel mixes should we tighten or grow?', 'DECIDE'],
        'eda_05_composite_risk_by_outcome.png': ['Does our composite risk score rank-order bad loans?', 'DECIDE'],
        'eda_06_score_vs_dti.png': ['Where do score and DTI combine into the danger zone?', 'DECIDE'],
        'eda_07_grade_product_heatmap.png': ['Which grade x product cells are the real problem?', 'DECIDE'],
        'eda_08_vintage_bad_rate.png': ['Is origination quality getting better or worse over time?', 'MONITOR'],
    }
    # 1
    fig, ax = plt.subplots(figsize=(8, 5))
    r = (d.groupby(C['GRADE'])[T].mean() * 100).sort_index()
    ax.bar(r.index.astype(str), r.values, color='#2E75B6'); ax.bar_label(ax.containers[0], fmt='%.1f%%')
    ax.set_title('Ever 90+ DPD rate by risk grade'); ax.set_ylabel('% of loans'); _save('eda_01_bad_rate_by_grade.png')
    # 2
    fig, ax = plt.subplots(figsize=(8, 5))
    for _v, _col in [(0, '#2E75B6'), (1, '#C00000')]:
        ax.hist(d.loc[d[T] == _v, C['SCORE']], bins=30, alpha=0.6, density=True, color=_col, label=CONFIG['TARGET_LABELS'][_v])
    ax.axvline(CONFIG['THRESH']['SCORE_SUBPRIME'], ls='--', color='k'); ax.legend(); ax.set_title('Credit score by outcome'); _save('eda_02_credit_score_by_outcome.png')
    # 3
    _cc = [C[k] for k in ['SCORE', 'AGE', 'INCOME', 'DTI_PRE', 'DTI_POST', 'AMOUNT', 'TERM', 'RATE', 'MOB', 'PROFIT', 'TARGET']] + ['composite_risk_score', 'loan_to_income', 'rate_spread_pct']
    cm = d[_cc].corr()
    fig, ax = plt.subplots(figsize=(11, 9))
    sns.heatmap(cm, mask=np.triu(np.ones_like(cm, dtype=bool)), annot=True, fmt='.2f', cmap='RdYlGn', center=0, annot_kws={'size': 7}, ax=ax)
    ax.set_title('Correlation heatmap'); _save('eda_03_correlation_heatmap.png')
    # 4
    piv = (d.pivot_table(index=C['PRODUCT'], columns=C['CHANNEL'], values=T, aggfunc='mean') * 100)
    fig, ax = plt.subplots(figsize=(9, 5)); piv.plot(kind='bar', ax=ax); ax.set_ylabel('Ever 90+ DPD %'); ax.set_title('Bad rate by product and channel')
    plt.xticks(rotation=30); _save('eda_04_product_channel_bad_rate.png')
    # 5
    fig, ax = plt.subplots(figsize=(8, 5))
    for _v, _col in [(0, '#2E75B6'), (1, '#C00000')]:
        ax.hist(d.loc[d[T] == _v, 'composite_risk_score'], bins=30, alpha=0.6, density=True, color=_col, label=CONFIG['TARGET_LABELS'][_v])
    ax.legend(); ax.set_title('Composite risk score by outcome'); _save('eda_05_composite_risk_by_outcome.png')
    # 6
    _s = d.sample(min(4000, len(d)), random_state=CONFIG['RANDOM_STATE'])
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(_s.loc[_s[T] == 0, C['SCORE']], _s.loc[_s[T] == 0, C['DTI_POST']], s=6, alpha=0.4, c='#2E75B6', label='Never 90+')
    ax.scatter(_s.loc[_s[T] == 1, C['SCORE']], _s.loc[_s[T] == 1, C['DTI_POST']], s=10, alpha=0.7, c='#C00000', label='Ever 90+')
    ax.axhline(CONFIG['THRESH']['DTI_MAX'], ls='--', color='k'); ax.axvline(CONFIG['THRESH']['SCORE_SUBPRIME'], ls='--', color='k')
    ax.set_xlabel('Credit score'); ax.set_ylabel('Post-loan DTI %'); ax.legend(); _save('eda_06_score_vs_dti.png')
    # 7
    hm = d.pivot_table(index=C['GRADE'], columns=C['PRODUCT'], values=T, aggfunc='mean') * 100
    fig, ax = plt.subplots(figsize=(9, 6)); sns.heatmap(hm, annot=True, fmt='.1f', cmap='RdYlGn_r', ax=ax)
    ax.set_title('Ever 90+ DPD % by grade and product'); _save('eda_07_grade_product_heatmap.png')
    # 8
    vm = d.groupby('orig_month').agg(rate=(T, 'mean'), n=(T, 'size')).reset_index()
    vm = vm[vm['n'] >= 20]
    fig, ax = plt.subplots(figsize=(11, 5))
    ax.plot(vm['orig_month'], vm['rate'] * 100, marker='o', color='#C00000'); ax.set_ylabel('Ever 90+ DPD %')
    ax.set_title('Bad rate by origination month (recent months are right-censored)')
    ax.set_xticks(range(0, len(vm), max(1, len(vm) // 12))); ax.set_xticklabels(vm['orig_month'].iloc[::max(1, len(vm) // 12)], rotation=45)
    _save('eda_08_vintage_bad_rate.png')
    with open(RD + 'chart_questions.json', 'w', encoding='utf-8') as _f:
        json.dump(CHART_MAP, _f, indent=2)
    print('8 charts saved to', RD)
    return None
