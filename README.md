1,200 loans. 72 variables. 4.8% have already reached 90+ days past due.

→ Ever-90+ DPD rate was 4.8%, with NPL balance equal to 0.68% of the book.
→ Subprime loans scored below 620 and defaulted at 7.8%, versus 4.5% for the rest.
→ The Random Forest model reached hold-out AUC of 0.744, with KS of 0.41 and the top 10% of loans capturing 29% of bad loans.
→ High-risk loans sum of 128 and carried a bad rate of 10.9%, while low-risk loans sum of  567 and carried a bad rate of 1.1%.
→ 110 current loans were flagged in the top-risk decile, with $2,063,592 outstanding and no missed payment yet.

The data indicates a risk concentration problem in underwriting and collections. Delinquency is not random across the book; it intensifies where affordability pressure and pricing misalignment push exposure into riskier segments before repayment performance deteriorates.
Methodology — The pipeline was built using Python, pandas, scikit-learn, RandomForest, KMeans, and GradientBoostingRegressor.