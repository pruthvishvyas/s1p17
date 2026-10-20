
import sys
import pandas as pd
from config.config import CONFIG
from src.data.ingest import load_and_validate
from src.data.clean import clean
from src.features.engineer import engineer
from src.analytics.eda import run_eda
from src.models.classify import run_classification
from src.models.segment import run_segmentation
from src.models.forecast import run_forecast
from src.analytics.business import run_business_logic
from src.analytics.simulate import run_simulations
from src.analytics.goals import run_goals_alerts
from src.analytics.insights import run_insights
from src.reporting.export import export


def main():
    phases = [
        ('Ingestion', load_and_validate, True),
        ('Cleaning', clean, True),
        ('Engineering', engineer, True),
        ('EDA', run_eda, False),
        ('Classify', run_classification, False),
        ('Segment', run_segmentation, False),
        ('Forecast', run_forecast, False),
        ('Business', run_business_logic, False),
        ('Simulation', run_simulations, False),
        ('Goals', run_goals_alerts, False),
        ('Insights', run_insights, False),
        ('Export', export, False),
    ]
    df = None
    for name, fn, critical in phases:
        try:
            print('Phase:', name)
            result = fn(df, CONFIG)
            if isinstance(result, pd.DataFrame):
                df = result
        except Exception as e:
            print('Phase', name, 'FAILED:', e)
            if critical:
                sys.exit(1)
            if df is None or not isinstance(df, pd.DataFrame):
                pass
    print('Pipeline complete.')


if __name__ == '__main__':
    main()
