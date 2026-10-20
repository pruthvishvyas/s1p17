import os, json, glob, datetime, warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
warnings.filterwarnings('ignore')

def run_classification(df, config):
    '''Phase 5: classifier'''
    CONFIG = config
    df_feat = df
    # PHASE 5 - CORE ML TASK 1: default-risk classification | Outcome: UNDERSTAND
    # Target: Ever_90DPD. Leakage columns (DPD, Status, Stage, charge-off, loss, provision, profit, EL, Payments_Made, Modelled_PD) are NOT features.
    import os, json, joblib
    import numpy as np, pandas as pd
    import matplotlib.pyplot as plt
    from sklearn.base import clone
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
    from sklearn.model_selection import StratifiedKFold, cross_val_score, cross_val_predict, train_test_split
    from sklearn.metrics import (roc_auc_score, average_precision_score, accuracy_score, classification_report,
                                 confusion_matrix, roc_curve, brier_score_loss, precision_recall_curve, recall_score, precision_score)
    from sklearn.inspection import permutation_importance
    C = CONFIG['COLS']
    RS = CONFIG['RANDOM_STATE']
    if 'df_feat' not in dir(): df_feat = pd.read_csv(CONFIG['FEAT_CSV'])
    NUM_FEATS = [C[k] for k in ['AGE', 'INCOME', 'SCORE', 'DTI_PRE', 'DTI_POST', 'AMOUNT', 'TERM', 'RATE', 'PAYMENT', 'ORIG_FEE', 'COF', 'MOB']] + \
        ['loan_to_income', 'payment_to_income_pct', 'dti_increase_pts', 'rate_spread_pct', 'fee_pct', 'seasoning_pct',
         'high_dti_flag', 'subprime_flag', 'long_term_flag', 'composite_risk_score', 'credit_score_band_code']
    CAT_FEATS = [C[k] for k in CONFIG['CAT_KEYS']]
    NUM_FEATS = [c for c in NUM_FEATS if c in df_feat.columns]
    CAT_FEATS = [c for c in CAT_FEATS if c in df_feat.columns]
    FEATURE_COLS = NUM_FEATS + CAT_FEATS
    X = df_feat[FEATURE_COLS]
    y = df_feat[C['TARGET']].astype(int)
    pos = int(y.sum()); neg = int(len(y) - pos)
    assert len(df_feat) >= CONFIG['MIN_ROWS_ML'], 'Not enough rows for ML: %d' % len(df_feat)
    assert pos >= CONFIG['MIN_POSITIVES'] and neg >= CONFIG['MIN_POSITIVES'], 'Not enough positive/negative cases: %d/%d' % (pos, neg)
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=CONFIG['TEST_SIZE'], stratify=y, random_state=RS)
    assert len(X_tr) >= 200
    print('Train %d | Test %d | positive rate %.2f%%' % (len(X_tr), len(X_te), 100 * y.mean()))

    # --- baselines: rule-based and the bank's own Modelled PD
    _rule = ((df_feat.loc[X_te.index, C['SCORE']] < CONFIG['THRESH']['SCORE_SUBPRIME']) | (df_feat.loc[X_te.index, C['DTI_POST']] > CONFIG['THRESH']['DTI_MAX'])).astype(int)
    print('Rule baseline (score<620 OR DTI>43): acc %.3f recall %.3f precision %.3f AUC %.3f' % (
        accuracy_score(y_te, _rule), recall_score(y_te, _rule), precision_score(y_te, _rule, zero_division=0), roc_auc_score(y_te, _rule)))
    bank_auc = float(roc_auc_score(y_te, df_feat.loc[X_te.index, C['PD']]))
    print('Bank Modelled_PD AUC on test: %.4f' % bank_auc)

    def make_pre():
        return ColumnTransformer([('num', StandardScaler(), NUM_FEATS),
                                  ('cat', OneHotEncoder(handle_unknown='ignore'), CAT_FEATS)], sparse_threshold=0)
    models = {
        'Logistic Regression': Pipeline([('pre', make_pre()), ('clf', LogisticRegression(max_iter=2000, C=0.5, class_weight='balanced'))]),
        'Random Forest': Pipeline([('pre', make_pre()), ('clf', RandomForestClassifier(n_estimators=250, min_samples_leaf=10, max_features='sqrt',
                                                                                        class_weight='balanced_subsample', n_jobs=-1, random_state=RS))]),
        'Gradient Boosting': Pipeline([('pre', make_pre()), ('clf', HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, max_leaf_nodes=15,
                                                                                                   min_samples_leaf=40, l2_regularization=1.0,
                                                                                                   early_stopping=True, validation_fraction=0.15, random_state=RS))]),
    }
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RS)
    if len(X_tr) > 40000:
        _idx = X_tr.sample(40000, random_state=RS).index
        Xcv, ycv = X_tr.loc[_idx], y_tr.loc[_idx]
    else:
        Xcv, ycv = X_tr, y_tr
    results = {}
    for name, mdl in models.items():
        cv = cross_val_score(mdl, Xcv, ycv, cv=skf, scoring='roc_auc')
        mdl.fit(X_tr, y_tr)
        p = mdl.predict_proba(X_te)[:, 1]
        results[name] = {'cv_mean': float(cv.mean()), 'cv_std': float(cv.std()), 'test_auc': float(roc_auc_score(y_te, p)),
                         'test_acc': float(accuracy_score(y_te, (p >= 0.5).astype(int)))}
        print('%-20s CV-AUC %.4f +/- %.4f | Test-AUC %.4f | Test-Acc %.4f' % (name, cv.mean(), cv.std(), results[name]['test_auc'], results[name]['test_acc']))
    best_name = max(results, key=lambda k: results[k]['cv_mean'])
    best_model = models[best_name]
    print('Best model by CV-AUC:', best_name)

    # --- decision threshold: maximise F2 (missing a bad loan costs more than a false alarm) using out-of-fold train predictions
    _oof_tr = cross_val_predict(clone(best_model), Xcv, ycv, cv=3, method='predict_proba')[:, 1]
    _p, _r, _t = precision_recall_curve(ycv, _oof_tr)
    _f2 = 5 * _p[:-1] * _r[:-1] / (4 * _p[:-1] + _r[:-1] + 1e-9)
    thr = float(_t[int(np.argmax(_f2))]) if len(_t) else 0.5
    p_te = best_model.predict_proba(X_te)[:, 1]
    pred_te = (p_te >= thr).astype(int)
    fpr, tpr, _ = roc_curve(y_te, p_te)
    ks = float(np.max(tpr - fpr))
    print('Threshold (F2-optimal): %.3f | AUC %.4f | PR-AUC %.4f | KS %.4f | Brier %.4f' % (
        thr, roc_auc_score(y_te, p_te), average_precision_score(y_te, p_te), ks, brier_score_loss(y_te, p_te)))
    print(classification_report(y_te, pred_te, target_names=['Never 90+', 'Ever 90+']))
    _top = int(np.ceil(0.10 * len(y_te)))
    top_decile_capture = float(y_te.values[np.argsort(-p_te)[:_top]].sum() / max(1, y_te.sum()))
    print('Top-10%% riskiest loans capture %.1f%% of all bad loans' % (100 * top_decile_capture))

    # --- honest out-of-fold probability for every loan, then refit on all data
    oof_all = cross_val_predict(clone(best_model), X, y, cv=skf, method='predict_proba')[:, 1]
    df_feat['pred_prob'] = oof_all
    df_feat['pred_flag'] = (oof_all >= thr).astype(int)
    final_model = clone(best_model).fit(X, y)
    joblib.dump(final_model, CONFIG['MODELS_DIR'] + 'best_classifier.pkl')
    joblib.dump(FEATURE_COLS, CONFIG['MODELS_DIR'] + 'feature_cols.pkl')
    joblib.dump({'num': NUM_FEATS, 'cat': CAT_FEATS}, CONFIG['MODELS_DIR'] + 'feature_spec.pkl')

    # --- plots
    fig, ax = plt.subplots(1, 2, figsize=(12, 5))
    cmx = confusion_matrix(y_te, pred_te)
    ax[0].imshow(cmx, cmap='Blues')
    for i in range(2):
        for j in range(2):
            ax[0].text(j, i, int(cmx[i, j]), ha='center', va='center')
    ax[0].set_xticks([0, 1]); ax[0].set_yticks([0, 1]); ax[0].set_xlabel('Predicted'); ax[0].set_ylabel('Actual'); ax[0].set_title('Confusion matrix (%s)' % best_name)
    ax[1].plot(fpr, tpr, label='%s AUC=%.3f' % (best_name, roc_auc_score(y_te, p_te))); ax[1].plot([0, 1], [0, 1], 'k--'); ax[1].legend(); ax[1].set_title('ROC curve')
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'ml_01_confusion_roc.png', dpi=150); plt.show(); plt.close()
    _samp = X_te.sample(min(3000, len(X_te)), random_state=RS)
    pi = permutation_importance(best_model, _samp, y_te.loc[_samp.index], scoring='roc_auc', n_repeats=3, random_state=RS)
    imp = pd.Series(pi.importances_mean, index=FEATURE_COLS).sort_values(ascending=False)
    top_features = [{'feature': k, 'importance': round(float(v), 5)} for k, v in imp.head(15).items()]
    fig, ax = plt.subplots(figsize=(8, 6)); imp.head(15)[::-1].plot(kind='barh', ax=ax, color='#2E75B6'); ax.set_title('Top 15 drivers (permutation importance, AUC drop)')
    plt.tight_layout(); plt.savefig(CONFIG['REPORTS_DIR'] + 'ml_02_feature_importance.png', dpi=150); plt.show(); plt.close()

    metrics = {'classifier': {'name': best_name, 'cv_auc': results[best_name]['cv_mean'], 'test_auc': float(roc_auc_score(y_te, p_te)),
                              'pr_auc': float(average_precision_score(y_te, p_te)), 'ks': ks, 'brier': float(brier_score_loss(y_te, p_te)),
                              'threshold': thr, 'recall': float(recall_score(y_te, pred_te)), 'precision': float(precision_score(y_te, pred_te, zero_division=0)),
                              'base_rate': float(y.mean()), 'bank_pd_auc': bank_auc, 'top_decile_capture': top_decile_capture,
                              'all_models': results},
               'top_features': top_features}
    with open(CONFIG['MODELS_DIR'] + 'metrics.json', 'w', encoding='utf-8') as _f:
        json.dump(metrics, _f, indent=2)
    df_feat[[C['ID'], C['TARGET'], C['PD'], 'pred_prob', 'pred_flag']].to_csv(CONFIG['PROCESSED_DIR'] + 'ml_task1_output.csv', index=False, encoding='utf-8')
    df_feat.to_csv(CONFIG['FEAT_CSV'], index=False, encoding='utf-8')
    print('Model, metrics and ml_task1_output.csv saved')
    return df_feat
