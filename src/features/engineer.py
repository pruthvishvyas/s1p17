import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def engineer(df, config):
    '''Phase 3: features'''
    CONFIG = config
    df_clean = df
    # PHASE 3 - FEATURE ENGINEERING | Outcome: UNDERSTAND + DECIDE + MONITOR
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    T = CONFIG['THRESH']
    if 'df_clean' not in dir(): df_clean = pd.read_csv(CONFIG['PROCESSED_CSV'])
    df_feat = df_clean.copy()
    df_feat[C['DATE']] = pd.to_datetime(df_feat[C['DATE']], errors='coerce')
    _amt = df_feat[C['AMOUNT']].replace(0, 1)
    _inc = df_feat[C['INCOME']].replace(0, 1)
    _term = df_feat[C['TERM']].replace(0, 1)

    # affordability
    df_feat['loan_to_income'] = df_feat[C['AMOUNT']] / _inc                      # loan size as multiple of yearly income
    df_feat['payment_to_income_pct'] = df_feat[C['PAYMENT']] * 12 / _inc * 100  # share of income going to this loan
    df_feat['dti_increase_pts'] = df_feat[C['DTI_POST']] - df_feat[C['DTI_PRE']] # how much debt burden this loan added
    # credit quality bands
    df_feat['credit_score_band'] = pd.cut(df_feat[C['SCORE']], bins=[0, 579, 619, 679, 739, 900],
                                          labels=['Poor <580', 'Fair 580-619', 'Good 620-679', 'Very Good 680-739', 'Excellent 740+']).astype(str)
    df_feat['credit_score_band_code'] = pd.cut(df_feat[C['SCORE']], bins=[0, 579, 619, 679, 739, 900], labels=False).fillna(0).astype(int)
    df_feat['age_group'] = pd.cut(df_feat[C['AGE']], bins=[0, 24, 34, 44, 54, 64, 120],
                                  labels=['<25', '25-34', '35-44', '45-54', '55-64', '65+']).astype(str)
    # pricing & profitability
    df_feat['rate_spread_pct'] = df_feat[C['RATE']] - df_feat[C['COF']]          # net interest margin at origination
    df_feat['fee_pct'] = df_feat[C['ORIG_FEE']] / _amt * 100
    df_feat['risk_adjusted_spread_pct'] = df_feat['rate_spread_pct'] - df_feat[C['PD']] * df_feat[C['LGD']] / 100  # margin after expected loss
    df_feat['realized_yield_pct'] = (df_feat[C['INT_INC']] + df_feat[C['FEE_INC']]) / _amt * 100
    df_feat['cost_to_serve_pct'] = (df_feat[C['SERV_COST']] + df_feat[C['ACQ_COST']]) / _amt * 100
    df_feat['net_profit_pct'] = df_feat[C['PROFIT']] / _amt * 100
    # seasoning / exposure
    df_feat['seasoning_pct'] = (df_feat[C['MOB']] / _term).clip(0, 1.5)
    df_feat['outstanding_pct'] = df_feat[C['OUTSTANDING']] / _amt
    # binary flags
    df_feat['high_dti_flag'] = (df_feat[C['DTI_POST']] > T['DTI_MAX']).astype(int)
    df_feat['subprime_flag'] = (df_feat[C['SCORE']] < T['SCORE_SUBPRIME']).astype(int)
    df_feat['long_term_flag'] = (df_feat[C['TERM']] >= 60).astype(int)
    # category combination
    df_feat['product_channel'] = df_feat[C['PRODUCT']].astype(str) + ' | ' + df_feat[C['CHANNEL']].astype(str)
    # composite risk score 0-100 (weights: credit 40%, DTI 30%, loan size vs income 15%, price 15%)
    df_feat['composite_risk_score'] = 100 * (
        0.40 * ((850 - df_feat[C['SCORE']]) / 550).clip(0, 1) +
        0.30 * (df_feat[C['DTI_POST']] / 100).clip(0, 1) +
        0.15 * df_feat['loan_to_income'].clip(0, 1) +
        0.15 * (df_feat[C['RATE']] / 36).clip(0, 1))
    # time keys
    df_feat['orig_month'] = df_feat[C['DATE']].dt.to_period('M').astype(str)
    df_feat['orig_year'] = df_feat[C['DATE']].dt.year
    df_feat = df_feat.replace([np.inf, -np.inf], np.nan)
    for _c in [c for c in df_feat.columns if df_feat[c].dtype.kind in 'fi' and df_feat[c].isnull().any()]:
        df_feat[_c] = df_feat[_c].fillna(df_feat[_c].median())
    df_feat.to_csv(CONFIG['FEAT_CSV'], index=False, encoding='utf-8')
    _new = [c for c in df_feat.columns if c not in df_clean.columns]
    print('New features (%d):' % len(_new), _new)
    print('feature_store.csv saved:', df_feat.shape)
    return df_feat
