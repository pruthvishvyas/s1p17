import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def clean(df, config):
    '''Phase 2: clean'''
    CONFIG = config
    # PHASE 2 - CLEANING & PREPROCESSING | Outcome: UNDERSTAND
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    if 'df' not in dir(): df = pd.read_csv(CONFIG['RAW_CSV'])
    df_clean = df.copy()
    _n0 = len(df_clean)
    df_clean = df_clean.drop_duplicates(subset=[C['ID']], keep='first').copy()
    print('Duplicate loan IDs removed:', _n0 - len(df_clean))

    # currency / percent formatting -> numeric
    for _k in CONFIG['NUM_KEYS']:
        _c = C[_k]
        if df_clean[_c].dtype == object:
            df_clean[_c] = df_clean[_c].astype(str).str.replace(r'[$,%\s]', '', regex=True)
        df_clean[_c] = pd.to_numeric(df_clean[_c], errors='coerce')
    df_clean[C['DATE']] = pd.to_datetime(df_clean[C['DATE']], errors='coerce')

    # negative money values are data errors -> NaN then impute
    for _k in CONFIG['NONNEG_KEYS']:
        _neg = int((df_clean[C[_k]] < 0).sum())
        if _neg:
            print('Negative values set to NaN in', C[_k], ':', _neg)
            df_clean.loc[df_clean[C[_k]] < 0, C[_k]] = np.nan

    # valid ranges
    df_clean[C['SCORE']] = df_clean[C['SCORE']].clip(300, 850)
    df_clean[C['AGE']] = df_clean[C['AGE']].clip(18, 100)
    for _k in ['DTI_PRE', 'DTI_POST', 'PD', 'LGD']:
        df_clean[C[_k]] = df_clean[C[_k]].clip(0, 100)

    # rows without a target cannot be used
    _nt = int(df_clean[C['TARGET']].isnull().sum())
    if _nt:
        print('Rows dropped - missing', C['TARGET'], ':', _nt)
        df_clean = df_clean.dropna(subset=[C['TARGET']])

    # imputation: numeric median, categorical 'Unknown'
    for _k in CONFIG['NUM_KEYS']:
        _c = C[_k]
        if df_clean[_c].isnull().any():
            print('Imputing median for', _c, ':', int(df_clean[_c].isnull().sum()))
            df_clean[_c] = df_clean[_c].fillna(df_clean[_c].median())
    for _k in CONFIG['CAT_KEYS']:
        df_clean[C[_k]] = df_clean[C[_k]].fillna('Unknown').astype(str).str.strip()

    # IQR outlier capping for continuous drivers
    for _k in ['INCOME', 'AMOUNT']:
        _c = C[_k]
        q1, q3 = df_clean[_c].quantile(0.25), df_clean[_c].quantile(0.75)
        lo, hi = q1 - 3.0 * (q3 - q1), q3 + 3.0 * (q3 - q1)
        _before = int(((df_clean[_c] < lo) | (df_clean[_c] > hi)).sum())
        df_clean[_c] = df_clean[_c].clip(max(lo, 0), hi)
        _after = int(((df_clean[_c] < lo) | (df_clean[_c] > hi)).sum())
        print('IQR cap', _c, '- outliers before:', _before, 'after:', _after)

    # target consistency: any loan at 90+ DPD has by definition been 90+ DPD
    df_clean[C['TARGET']] = ((df_clean[C['TARGET']] == 1) | (df_clean[C['DPD']] >= CONFIG['THRESH']['DPD_NPL'])).astype(int)
    df_clean[C['STAGE']] = df_clean[C['STAGE']].round().clip(1, 3).astype(int)

    # readable labels
    df_clean['target_label'] = df_clean[C['TARGET']].map(CONFIG['TARGET_LABELS'])
    df_clean['stage_label'] = df_clean[C['STAGE']].map(CONFIG['STAGE_LABELS'])
    df_clean = df_clean.reset_index(drop=True)
    df_clean.to_csv(CONFIG['PROCESSED_CSV'], index=False, encoding='utf-8')
    print('Clean shape:', df_clean.shape, '| Ever90 rate: %.2f%%' % (100 * df_clean[C['TARGET']].mean()))
    return df_clean
