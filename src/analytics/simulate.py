import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_simulations(df, config):
    '''Phase 8B: simulations'''
    CONFIG = config
    df_feat = df
    # PHASE 8B - SIMULATION ENGINE | Outcome: DECIDE (what-if lookups for Skill 2/3)
    import os, json
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    SD = CONFIG['PROCESSED_DIR'] + 'simulations/'
    os.makedirs(SD, exist_ok=True)
    d = df_feat
    def _w(name, obj):
        with open(SD + name, 'w', encoding='utf-8') as _f:
            json.dump(obj, _f, indent=2)
    def _stats(sub):
        n = len(sub)
        return {'loans': int(n), 'share_of_loans_pct': round(100 * n / max(1, len(d)), 2),
                'bad_rate_pct': round(100 * float(sub[C['TARGET']].mean()), 3) if n else None,
                'net_profit_total': round(float(sub[C['PROFIT']].sum()), 2),
                'net_profit_per_loan': round(float(sub[C['PROFIT']].mean()), 2) if n else None,
                'volume': round(float(sub[C['AMOUNT']].sum()), 2),
                'expected_loss': round(float(sub[C['EL']].sum()), 2)}
    # 1. approval credit-score cutoff
    cut = [{'cutoff': int(c), **_stats(d[d[C['SCORE']] >= c])} for c in [540, 560, 580, 600, 620, 640, 660, 680, 700, 720]]
    _w('score_cutoff_impact.json', {'variable': 'minimum_credit_score', 'baseline': _stats(d), 'scenarios': cut,
                                    'note': 'Historical back-test: what the book would look like had loans below the cutoff been declined.'})
    # 2. DTI cap
    cap = [{'dti_cap': float(c), **_stats(d[d[C['DTI_POST']] <= c])} for c in [30, 35, 38, 40, 43, 45, 50, 60]]
    _w('dti_cap_impact.json', {'variable': 'max_post_loan_dti_pct', 'baseline': _stats(d), 'scenarios': cap,
                               'note': 'Historical back-test of declining loans above the post-loan DTI cap.'})
    # 3. repricing (assumption-driven: volume elasticity)
    ELASTICITY = 3.0  # assumed % volume lost per +1pp rate (client can override in dashboard)
    base_inc = float((d[C['OUTSTANDING']] * d[C['RATE']] / 100).sum())
    rp = []
    for dl in [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2]:
        vol = max(0.0, 1 - ELASTICITY * dl / 100)
        new_inc = float((d[C['OUTSTANDING']] * vol * (d[C['RATE']] + dl) / 100).sum())
        rp.append({'rate_change_pp': dl, 'volume_factor': round(vol, 4), 'annual_interest_income': round(new_inc, 2),
                   'change_vs_baseline': round(new_inc - base_inc, 2), 'change_pct': round(100 * (new_inc - base_inc) / base_inc, 2) if base_inc else None})
    _w('rate_change_impact.json', {'variable': 'interest_rate_change_pp', 'baseline_annual_interest_income': round(base_inc, 2),
                                   'assumptions': {'volume_elasticity_pct_per_pp': ELASTICITY, 'note': 'Applied across active book as an annualised proxy; adverse selection not modelled.'},
                                   'scenarios': rp})
    print('Simulations written:', os.listdir(SD))
    return None
