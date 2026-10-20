import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_forecast(df, config):
    '''Phase 7: regression and forecast'''
    CONFIG = config
    df_feat = df
    # PHASE 7 - PREDICTIVE MODELING | Outcome: MONITOR
    # (a) loan-level net profit regressor  (b) 3-month origination forecast (quarterly planning horizon)
    import json, joblib
    import numpy as np, pandas as pd
    import matplotlib.pyplot as plt
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.ensemble import HistGradientBoostingRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score
    C = CONFIG['COLS']
    RS = CONFIG['RANDOM_STATE']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    spec = joblib.load(CONFIG['MODELS_DIR'] + 'feature_spec.pkl')
    feats = spec['num'] + spec['cat']
    X = df_feat[feats]; yv = df_feat[C['PROFIT']]
    X_tr, X_te, y_tr, y_te = train_test_split(X, yv, test_size=CONFIG['TEST_SIZE'], random_state=RS)
    assert len(X_tr) >= 200, 'Not enough rows for profit regressor'
    gb_reg = Pipeline([('pre', ColumnTransformer([('num', StandardScaler(), spec['num']), ('cat', OneHotEncoder(handle_unknown='ignore'), spec['cat'])], sparse_threshold=0)),
                       ('reg', HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=40, l2_regularization=1.0, random_state=RS))])
    gb_reg.fit(X_tr, y_tr)
    pr = gb_reg.predict(X_te)
    mae = float(mean_absolute_error(y_te, pr)); r2 = float(r2_score(y_te, pr))
    mae_base = float(mean_absolute_error(y_te, np.full(len(y_te), y_tr.mean())))
    print('Net profit regressor: MAE %.2f (naive %.2f) | R2 %.4f' % (mae, mae_base, r2))
    joblib.dump(gb_reg, CONFIG['MODELS_DIR'] + 'profit_regressor.pkl')
    print(df_feat.groupby('credit_score_band').agg(loans=(C['ID'], 'size'), bad_rate=(C['TARGET'], 'mean'), avg_profit=(C['PROFIT'], 'mean')).round(3))
    fig, ax = plt.subplots(1, 2, figsize=(12, 5))
    ax[0].scatter(y_te, pr, s=4, alpha=0.3); _lim = [min(y_te.min(), pr.min()), max(y_te.max(), pr.max())]; ax[0].plot(_lim, _lim, 'r--')
    ax[0].set_xlabel('Actual net profit'); ax[0].set_ylabel('Predicted'); ax[0].set_title('Net profit: actual vs predicted')
    ax[1].hist(y_te - pr, bins=40, color='#2E75B6'); ax[1].set_title('Residuals')
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'ml_04_profit_regression.png', dpi=150); plt.show(); plt.close()

    # ---- monthly origination forecast
    H = CONFIG['FORECAST_HORIZON_MONTHS']
    dd = df_feat[[C['DATE'], C['AMOUNT']]].copy()
    dd[C['DATE']] = pd.to_datetime(dd[C['DATE']], errors='coerce'); dd = dd.dropna(subset=[C['DATE']])
    last = dd[C['DATE']].max()
    dd['m'] = dd[C['DATE']].dt.to_period('M')
    mon = dd.groupby('m').agg(loans=(C['AMOUNT'], 'size'), volume=(C['AMOUNT'], 'sum')).sort_index()
    if last.day < last.days_in_month - 2 and len(mon) > 1:
        print('Dropping partial final month', mon.index[-1]); mon = mon.iloc[:-1]
    months = mon.index
    def _design(n0, n1, mnums, seasonal):
        t = np.arange(n0, n1)
        cols = [t]
        if seasonal:
            cols += [np.sin(2 * np.pi * mnums / 12), np.cos(2 * np.pi * mnums / 12)]
        return np.column_stack(cols)
    def fit_forecast(y, mnums_hist, mnums_future):
        n = len(y); seasonal = n >= 18
        if n < 6:
            mu = float(np.mean(y[-3:])); return np.full(len(mnums_future), mu), np.full(len(mnums_future), mu), np.full(len(mnums_future), mu), float('nan'), None
        mape = float('nan')
        if n >= 12:
            k = 3
            m_bt = LinearRegression().fit(_design(0, n - k, mnums_hist[:n - k], seasonal), y[:n - k])
            f_bt = m_bt.predict(_design(n - k, n, mnums_hist[n - k:], seasonal))
            mape = float(np.mean(np.abs(y[n - k:] - f_bt) / np.maximum(y[n - k:], 1)))
        mdl = LinearRegression().fit(_design(0, n, mnums_hist, seasonal), y)
        resid = y - mdl.predict(_design(0, n, mnums_hist, seasonal)); sd = float(np.std(resid))
        f = np.maximum(mdl.predict(_design(n, n + len(mnums_future), mnums_future, seasonal)), 0)
        return f, np.maximum(f - 1.28 * sd, 0), f + 1.28 * sd, mape, mdl
    fut_periods = pd.period_range(months[-1] + 1, periods=H, freq='M')
    rows = []; fmodels = {}; fc_mape = {}
    for metric in ['loans', 'volume']:
        yy = mon[metric].values.astype(float)
        f, lo, hi, mape, mdl = fit_forecast(yy, np.array([p.month for p in months]), np.array([p.month for p in fut_periods]))
        fmodels[metric] = mdl; fc_mape[metric] = mape
        for p, v in zip(months, yy):
            rows.append({'month': str(p), 'metric': metric, 'actual': float(v), 'forecast': np.nan, 'lower': np.nan, 'upper': np.nan, 'kind': 'history'})
        for p, a, b, c_ in zip(fut_periods, f, lo, hi):
            rows.append({'month': str(p), 'metric': metric, 'actual': np.nan, 'forecast': float(a), 'lower': float(b), 'upper': float(c_), 'kind': 'forecast'})
        print('%s forecast next %d months: %s | backtest MAPE %s' % (metric, H, np.round(f, 0), ('%.1f%%' % (100 * mape)) if mape == mape else 'n/a (<12 months history)'))
    fc = pd.DataFrame(rows)
    fc.to_csv(CONFIG['PROCESSED_DIR'] + 'forecast_output.csv', index=False, encoding='utf-8')
    joblib.dump({'models': fmodels, 'n_history': int(len(months)), 'last_period': str(months[-1]), 'horizon': H}, CONFIG['MODELS_DIR'] + 'forecast_model.pkl')
    fig, ax = plt.subplots(figsize=(11, 5))
    _h = fc[(fc.metric == 'loans') & (fc.kind == 'history')]; _f = fc[(fc.metric == 'loans') & (fc.kind == 'forecast')]
    ax.plot(_h['month'], _h['actual'], marker='o', label='Actual loans'); ax.plot(_f['month'], _f['forecast'], marker='o', color='#C00000', label='Forecast')
    ax.fill_between(_f['month'], _f['lower'], _f['upper'], color='#C00000', alpha=0.2)
    ax.set_xticks(range(0, len(_h) + len(_f), max(1, (len(_h) + len(_f)) // 12)))
    ax.legend(); ax.set_title('Monthly originations - history and %d-month forecast' % H); plt.xticks(rotation=45)
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'ml_05_origination_forecast.png', dpi=150); plt.show(); plt.close()
    try:
        metrics = json.load(open(CONFIG['MODELS_DIR'] + 'metrics.json', encoding='utf-8'))
    except Exception:
        metrics = {}
    metrics['profit_regressor'] = {'mae': mae, 'r2': r2, 'mae_naive': mae_base}
    metrics['forecast'] = {'horizon_months': H, 'months_history': int(len(months)), 'mape_loans': fc_mape.get('loans'), 'mape_volume': fc_mape.get('volume')}
    with open(CONFIG['MODELS_DIR'] + 'metrics.json', 'w', encoding='utf-8') as _f_:
        json.dump(metrics, _f_, indent=2)
    fc_metrics = {'mae': mae, 'r2': r2}
    return fc_metrics
