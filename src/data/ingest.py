import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def load_and_validate(df, config):
    '''Phase 1: ingest and validate'''
    CONFIG = config
    # PHASE 1 - INGESTION & VALIDATION | Outcome: UNDERSTAND
    import os, glob, json
    import numpy as np, pandas as pd
    C = CONFIG['COLS']
    raw_path = CONFIG['RAW_CSV']
    if not os.path.exists(raw_path):
        cands = sorted(glob.glob('data/raw/*.csv')) + sorted(glob.glob('*.csv'))
        if not cands:
            raise FileNotFoundError('Place the loan CSV at ' + CONFIG['RAW_CSV'])
        raw_path = cands[0]
        print('Using raw file:', raw_path)
    df = pd.read_csv(raw_path)
    if raw_path != CONFIG['RAW_CSV']:
        os.makedirs(os.path.dirname(CONFIG['RAW_CSV']), exist_ok=True)
        df.to_csv(CONFIG['RAW_CSV'], index=False)

    expected = list(C.values())
    missing = [c for c in expected if c not in df.columns]
    extra = [c for c in df.columns if c not in expected]
    print('Rows x cols:', df.shape)
    print('Missing columns:', missing)
    print('Unexpected columns:', extra)
    nulls = df.isnull().sum()
    print('Columns with nulls:'); print(nulls[nulls > 0] if (nulls > 0).any() else 'none')
    print(df.dtypes.value_counts())
    for _k in CONFIG['CAT_KEYS'] + ['TARGET', 'STAGE', 'STATUS']:
        if C[_k] in df.columns:
            print('\n' + C[_k]); print(df[C[_k]].value_counts(dropna=False).head(12))

    issues = []
    def _chk(name, mask):
        n = int(mask.sum())
        if n:
            issues.append({'check': name, 'rows': n})
    if not missing:
        _v = df.copy()
        for _k in CONFIG['NUM_KEYS']:
            _v[C[_k]] = pd.to_numeric(_v[C[_k]].astype(str).str.replace(r'[$,%\s]', '', regex=True), errors='coerce')
        _chk('duplicate_loan_id', _v.duplicated(C['ID']))
        _chk('negative_money_values', (_v[[C[k] for k in CONFIG['NONNEG_KEYS']]] < 0).any(axis=1))
        _chk('credit_score_out_of_range', ~_v[C['SCORE']].between(300, 850))
        _chk('age_out_of_range', ~_v[C['AGE']].between(18, 100))
        _chk('outstanding_gt_loan_amount', _v[C['OUTSTANDING']] > _v[C['AMOUNT']] * 1.001)
        _chk('payments_made_gt_term', _v[C['PAYMENTS']] > _v[C['TERM']])
        _chk('ever90_flag_inconsistent_with_dpd', (_v[C['DPD']] >= 90) & (_v[C['TARGET']] == 0))
        _chk('post_dti_below_pre_dti', _v[C['DTI_POST']] < _v[C['DTI_PRE']])
        _chk('unparseable_origination_date', pd.to_datetime(_v[C['DATE']], errors='coerce').isnull())
        _tgt = pd.to_numeric(df[C['TARGET']], errors='coerce')
        _pos = int((_tgt == 1).sum())
    else:
        _pos = 0
    validation = {
        'rows': int(len(df)), 'cols': int(df.shape[1]),
        'null_total': int(df.isnull().sum().sum()),
        'nulls_by_column': {k: int(v) for k, v in df.isnull().sum().items() if v > 0},
        'missing_columns': missing, 'unexpected_columns': extra,
        'target_positive_count': _pos,
        'target_positive_rate': float(_pos / len(df)) if len(df) else 0.0,
        'schema_ok': len(missing) == 0,
        'min_rows_ok': bool(len(df) >= CONFIG['MIN_ROWS_ML']),
        'min_positives_ok': bool(_pos >= CONFIG['MIN_POSITIVES']),
        'issues': issues,
    }
    print('\nValidation issues:', issues if issues else 'none')
    with open(CONFIG['PROCESSED_DIR'] + 'validation_report.json', 'w', encoding='utf-8') as _f:
        json.dump(validation, _f, indent=2)
    assert validation['schema_ok'], 'Schema check failed: ' + str(missing)
    print('validation_report.json written')
    return df
