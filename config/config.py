import os
CID = 'loan_portfolio'
CONFIG = {
    'CLIENT_ID': CID,
    'OUTCOME_LAYERS': ['UNDERSTAND', 'DECIDE', 'MONITOR'],
    'SAAS_READY': True,
    'PROJECT_NAME': 'Consumer Lending Portfolio Intelligence',
    'DOMAIN': 'consumer_lending',
    'RAW_CSV': 'data/raw/loan_portfolio.csv',
    'PROCESSED_CSV': 'data/processed/clean_data.csv',
    'FEAT_CSV': 'data/processed/feature_store.csv',
    'PROCESSED_DIR': 'data/processed/',
    'REPORTS_DIR': 'reports/',
    'MODELS_DIR': 'models/',
    'OUTPUT_DIR': 'output/',
    'CONFIG_DIR': 'config/',
    'RANDOM_STATE': 42,
    'TEST_SIZE': 0.25,
    'ANOMALY_CONT': 0.05,
    'N_CLUSTERS': 3,
    'MIN_ROWS_ML': 300,
    'MIN_POSITIVES': 30,
    'FORECAST_HORIZON_MONTHS': 3,
    'COLS': {
        'ID': 'Loan_ID', 'CUST': 'Customer_ID', 'DATE': 'Origination_Date', 'VINTAGE': 'Vintage',
        'PRODUCT': 'Product', 'CHANNEL': 'Channel', 'REGION': 'Region', 'AGE': 'Age',
        'EMP': 'Employment_Type', 'HOME': 'Home_Ownership', 'INCOME': 'Annual_Income',
        'SCORE': 'Credit_Score', 'GRADE': 'Risk_Grade', 'DTI_PRE': 'Pre_Loan_DTI_pct',
        'DTI_POST': 'Post_Loan_DTI_pct', 'AMOUNT': 'Loan_Amount', 'TERM': 'Term_Months',
        'RATE': 'Interest_Rate_pct', 'PAYMENT': 'Monthly_Payment', 'ORIG_FEE': 'Origination_Fee',
        'COF': 'Cost_of_Funds_pct', 'PD': 'Modelled_PD_pct', 'LGD': 'LGD_pct',
        'MOB': 'Months_on_Book', 'PAYMENTS': 'Payments_Made', 'STATUS': 'Loan_Status',
        'DPD': 'Days_Past_Due', 'STAGE': 'IFRS9_Stage', 'TARGET': 'Ever_90DPD',
        'OUTSTANDING': 'Outstanding_Principal', 'INT_INC': 'Interest_Income', 'FEE_INC': 'Fee_Income',
        'FUND_COST': 'Funding_Cost', 'SERV_COST': 'Servicing_Cost', 'ACQ_COST': 'Acquisition_Cost',
        'CHARGEOFF': 'Charged_Off_Amount', 'RECOVERY': 'Recovery_Amount', 'NET_LOSS': 'Net_Loss',
        'PROVISION': 'Loss_Provision', 'PROFIT': 'Net_Profit_to_Date', 'EL': 'Expected_Loss_Amount',
    },
    'NUM_KEYS': ['AGE', 'INCOME', 'SCORE', 'DTI_PRE', 'DTI_POST', 'AMOUNT', 'TERM', 'RATE', 'PAYMENT',
                 'ORIG_FEE', 'COF', 'PD', 'LGD', 'MOB', 'PAYMENTS', 'DPD', 'STAGE', 'TARGET',
                 'OUTSTANDING', 'INT_INC', 'FEE_INC', 'FUND_COST', 'SERV_COST', 'ACQ_COST',
                 'CHARGEOFF', 'RECOVERY', 'NET_LOSS', 'PROVISION', 'PROFIT', 'EL'],
    'NONNEG_KEYS': ['INCOME', 'AMOUNT', 'PAYMENT', 'ORIG_FEE', 'OUTSTANDING', 'INT_INC', 'FEE_INC',
                    'FUND_COST', 'SERV_COST', 'ACQ_COST', 'CHARGEOFF', 'RECOVERY', 'NET_LOSS',
                    'PROVISION', 'EL'],
    'CAT_KEYS': ['PRODUCT', 'CHANNEL', 'REGION', 'EMP', 'HOME', 'GRADE'],
    # Domain-justified thresholds (never arbitrary)
    'THRESH': {
        'DTI_MAX': 43.0,            # 43% = US Qualified Mortgage ability-to-repay ceiling, standard unsecured cap too
        'SCORE_SUBPRIME': 620,      # industry subprime boundary
        'DPD_COLLECT': 30,          # IFRS9 Stage 2 backstop (30 DPD)
        'DPD_NPL': 90,              # IFRS9 Stage 3 / non-performing
        'WATCH_QUANTILE': 0.90,     # top decile of model risk among current loans = early-warning list
        'UNPROFITABLE_MIN_MOB': 12, # a loan needs 12 months to recover acquisition cost
        'MIN_SEGMENT_LOANS': 100,   # minimum loans before a segment rate is trusted
    },
    'STAGE_LABELS': {1: 'Stage 1 - Performing', 2: 'Stage 2 - Watch', 3: 'Stage 3 - Impaired'},
    'TARGET_LABELS': {0: 'Never 90+ DPD', 1: 'Ever 90+ DPD'},
    'TERMINOLOGY': {
        'revenue': 'Interest & Fee Income',
        'customer': 'Borrower',
        'product': 'Loan Product',
        'transaction': 'Loan',
    },
    'GOALS_DEFAULT': {
        'ever_90dpd_rate_target': {'value': None, 'unit': 'percent', 'client_sets': True,
                                   'description': 'Target share of loans that ever reach 90+ DPD'},
        'monthly_origination_target': {'value': None, 'unit': 'loans_per_month', 'client_sets': True},
        'alert_npl_ratio_pct': {'value': 5, 'unit': 'percent', 'description': 'Alert if NPL balance exceeds this % of book'},
        'alert_stage2_share_pct': {'value': 15, 'unit': 'percent', 'description': 'Alert if Stage 2 balance exceeds this % of book'},
        'alert_high_dti_share_pct': {'value': 25, 'unit': 'percent', 'description': 'Alert if recent originations above DTI cap exceed this share'},
        'alert_vintage_bad_rate_increase_pct': {'value': 20, 'unit': 'percent', 'description': 'Alert if recent vintages are this much worse than history'},
        'alert_drop_pct': {'value': 20, 'unit': 'percent', 'description': 'Alert if forecast originations drop by this %'},
        'forecast_horizon': {'value': 3, 'unit': 'months'},
    },
    'BIGQUERY': {
        'project_id': '',
        'dataset': '',
        'table': 'feat',
        'credentials_file': 'credentials.json',
    },
}
