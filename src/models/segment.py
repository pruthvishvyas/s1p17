import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_segmentation(df, config):
    '''Phase 6: segments and anomalies'''
    CONFIG = config
    df_feat = df
    # PHASE 6 - CORE ML TASK 2: risk segments + anomalies | Outcome: UNDERSTAND (segments, anomalies) + DECIDE
    import joblib
    import numpy as np, pandas as pd
    import matplotlib.pyplot as plt
    from sklearn.preprocessing import StandardScaler
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.ensemble import IsolationForest
    from sklearn.metrics import silhouette_score
    C = CONFIG['COLS']
    RS = CONFIG['RANDOM_STATE']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    seg_cols = [c for c in [C['SCORE'], C['DTI_POST'], 'loan_to_income', C['RATE'], C['AMOUNT'], 'composite_risk_score'] if c in df_feat.columns]
    assert len(df_feat) >= 50, 'Not enough rows for segmentation'
    sc = StandardScaler(); X_seg = sc.fit_transform(df_feat[seg_cols])
    km = KMeans(n_clusters=CONFIG['N_CLUSTERS'], n_init=10, random_state=RS)
    lab = km.fit_predict(X_seg)
    _s = np.random.RandomState(RS).choice(len(X_seg), min(10000, len(X_seg)), replace=False)
    sil = float(silhouette_score(X_seg[_s], lab[_s]))
    df_feat['_cl'] = lab
    _order = df_feat.groupby('_cl')['composite_risk_score'].mean().sort_values().index.tolist()
    _names = {c: n for c, n in zip(_order, ['Low Risk', 'Medium Risk', 'High Risk'])}
    df_feat['risk_segment'] = df_feat['_cl'].map(_names)
    df_feat = df_feat.drop(columns=['_cl'])
    print('KMeans silhouette: %.3f' % sil)
    an_cols = [c for c in [C['SCORE'], C['DTI_POST'], 'loan_to_income', C['RATE'], 'rate_spread_pct', 'fee_pct', 'payment_to_income_pct', C['AMOUNT']] if c in df_feat.columns]
    iso = IsolationForest(n_estimators=200, contamination=CONFIG['ANOMALY_CONT'], random_state=RS, n_jobs=-1)
    iso.fit(df_feat[an_cols])
    df_feat['is_anomaly'] = (iso.predict(df_feat[an_cols]) == -1).astype(int)
    df_feat['anomaly_score'] = -iso.score_samples(df_feat[an_cols])
    _an = df_feat['is_anomaly'] == 1
    print('Anomalies: %d | bad rate in anomalies %.2f%% vs %.2f%% overall' % (int(_an.sum()), 100 * df_feat.loc[_an, C['TARGET']].mean(), 100 * df_feat[C['TARGET']].mean()))
    joblib.dump(km, CONFIG['MODELS_DIR'] + 'kmeans_segments.pkl'); joblib.dump(sc, CONFIG['MODELS_DIR'] + 'segment_scaler.pkl')
    joblib.dump(iso, CONFIG['MODELS_DIR'] + 'isolation_forest.pkl')
    summ = df_feat.groupby('risk_segment').agg(loans=(C['ID'], 'size'), bad_rate=(C['TARGET'], 'mean'), avg_score=(C['SCORE'], 'mean'),
                                               avg_rate=(C['RATE'], 'mean'), avg_dti=(C['DTI_POST'], 'mean'), outstanding=(C['OUTSTANDING'], 'sum'),
                                               net_profit=(C['PROFIT'], 'sum')).reset_index()
    print(summ.round(3))
    summ.to_csv(CONFIG['PROCESSED_DIR'] + 'segment_summary.csv', index=False, encoding='utf-8')
    pc = PCA(n_components=2, random_state=RS).fit_transform(X_seg)
    _p = np.random.RandomState(RS).choice(len(pc), min(6000, len(pc)), replace=False)
    fig, ax = plt.subplots(1, 2, figsize=(13, 5))
    _colors = {'Low Risk': '#2E8B57', 'Medium Risk': '#F0A30A', 'High Risk': '#C00000'}
    for _n, _c in _colors.items():
        _m = (df_feat['risk_segment'].values[_p] == _n)
        ax[0].scatter(pc[_p][_m, 0], pc[_p][_m, 1], s=5, alpha=0.5, c=_c, label=_n)
    ax[0].legend(); ax[0].set_title('Risk segments (PCA)')
    _a = df_feat['is_anomaly'].values[_p] == 1
    ax[1].scatter(pc[_p][~_a, 0], pc[_p][~_a, 1], s=5, alpha=0.3, c='#2E75B6', label='Normal')
    ax[1].scatter(pc[_p][_a, 0], pc[_p][_a, 1], s=12, alpha=0.8, c='#C00000', label='Anomaly'); ax[1].legend(); ax[1].set_title('Anomalous loans (PCA)')
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'ml_03_segments_anomalies.png', dpi=150); plt.show(); plt.close()
    df_feat[[C['ID'], 'risk_segment', 'is_anomaly', 'anomaly_score']].to_csv(CONFIG['PROCESSED_DIR'] + 'ml_task2_output.csv', index=False, encoding='utf-8')
    df_feat.to_csv(CONFIG['FEAT_CSV'], index=False, encoding='utf-8')
    return df_feat
