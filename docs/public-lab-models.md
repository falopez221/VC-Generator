# Public demonstrative models

The versioned source of truth is `src/lab/model-catalog.ts`. Version 2.0.0 exposes twelve bounded, deterministic models. Their formulas and visible weights are demonstrative and do not reproduce the private scoring or calibration system.

1. **MCDA** normalizes visible weights, exposes dimension contributions and applies explicit risk, evidence and uncertainty adjustments.
2. **Monte Carlo** uses a seeded pseudo-random generator to report percentiles, threshold probability and loss probability under editable assumptions.
3. **Sensitivity** reruns ranking after visible weight and tolerance changes and explains the parameter that actually changed.
4. **Bayesian Update** separates a prior from a demonstrative likelihood and posterior; it does not prove demand or causality.
5. **Scenarios** compares downside, base and upside return indices without presenting them as financial forecasts.
6. **Risk Matrix** keeps probability, impact, uncertainty, mitigation and evidence visible together.
7. **Pareto** identifies non-dominated alternatives across two selected objectives.
8. **Least Squares** describes a linear association and residuals; small or constant samples return an explicit non-informative state.
9. **Tornado Sensitivity** varies one public dimension at a time and ranks score ranges by impact.
10. **Break-even** connects price, CAC, churn, margin and fixed cost to retained contribution, customer threshold, adoption and payback.
11. **Rank Robustness** runs seeded perturbations of public weights and reports mean rank, first-place frequency and top-three retention.
12. **Validation Priority** ranks the next evidence request using an ordinal value-of-information-style index; it is not monetary EVSI and authorizes no spend.

Every model must keep finite bounds, expose assumptions and limitations, and return the same result for identical validated inputs, version, weights and seed.
