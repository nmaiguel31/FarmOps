export type MetricDefinition = {
  name: string;
  meaning: string;
  calculation: string;
  interpretation: string;
};

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  operationalScore: {
    name: 'Operational Score',
    meaning: 'Composite score from 0 to 100 representing the overall condition of the farm operation.',
    calculation: 'Calculated from field health, simulated NDVI, profitability, active alerts, and weather risk.',
    interpretation: 'Higher values indicate healthier operations. Lower values mean the operation needs closer review.'
  },
  overallFarmHealth: {
    name: 'Overall Farm Health',
    meaning: 'Average health condition across active fields.',
    calculation: 'Calculated from the field health values already used in FarmOps field monitoring.',
    interpretation: 'Green/high values indicate strong field condition. Lower values suggest stress or inspection needs.'
  },
  periodProfit: {
    name: 'Period Profit',
    meaning: 'Profit for the currently selected reporting period.',
    calculation: 'Revenue minus expenses for records within the selected date range.',
    interpretation: 'Positive profit means revenue exceeded expenses. Negative profit means costs were higher than revenue.'
  },
  averageNdvi: {
    name: 'Average NDVI',
    meaning: 'Average vegetation health indicator across fields.',
    calculation: 'In this prototype, NDVI is simulated from field health indicators and saved vegetation values, not live satellite imagery.',
    interpretation: 'Higher NDVI suggests stronger vegetation. Lower NDVI suggests crop stress or poor vegetation performance.'
  },
  activeOperations: {
    name: 'Active Operations',
    meaning: 'Operational signals that are still unresolved.',
    calculation: 'Counts persisted Operations Center signals with Active status.',
    interpretation: 'Higher values mean more operational items need attention.'
  },
  weatherRisk: {
    name: 'Weather Risk',
    meaning: 'Current weather-related operational risk.',
    calculation: 'Derived from active weather signals such as heavy rain, high temperature, strong wind, or dry conditions.',
    interpretation: 'Stable means no active weather signals. Monitoring or Elevated means weather may affect farm activities.'
  },
  totalFarms: {
    name: 'Total Farms',
    meaning: 'Number of current farms in the workspace.',
    calculation: 'Counts existing farm records and excludes deleted or unavailable farms.',
    interpretation: 'Shows the current operational farm footprint.'
  },
  activeFarms: {
    name: 'Active Farms',
    meaning: 'Current farms being managed in FarmOps.',
    calculation: 'Counts existing farm records available to the current workspace.',
    interpretation: 'Use this to confirm the number of farms actively represented in the system.'
  },
  activeFields: {
    name: 'Active Fields',
    meaning: 'Fields currently available for operational monitoring.',
    calculation: 'Counts existing fields linked to current farms.',
    interpretation: 'Use this to understand how many field units are being monitored.'
  },
  activeCrops: {
    name: 'Active Crops',
    meaning: 'Crops currently linked to active field crop cycles.',
    calculation: 'Counts unique crop assignments on active fields.',
    interpretation: 'Higher values indicate more active crop diversity or crop cycles.'
  },
  activeAlerts: {
    name: 'Active Alerts',
    meaning: 'Operations Center signals that still require attention.',
    calculation: 'Counts persisted signals with Active status.',
    interpretation: 'A value of zero means no unresolved operational signals are currently open.'
  },
  netProfit: {
    name: 'Net Profit',
    meaning: 'Overall profit after subtracting expenses from revenue.',
    calculation: 'Total income minus total expenses from financial records in the selected scope.',
    interpretation: 'Positive values indicate profit. Negative values indicate expenses exceed revenue.'
  },
  farmHealth: {
    name: 'Farm Health',
    meaning: 'Farm-level condition based on the health of its fields.',
    calculation: 'Aggregates field health scores for fields within each farm.',
    interpretation: 'Use this to spot farms with weaker field conditions.'
  },
  operationsOverview: {
    name: 'Operations Overview',
    meaning: 'Summary of operational items that may need attention.',
    calculation: 'Groups active Operations Center signals by category such as weather, NDVI, lifecycle, and financial risk.',
    interpretation: 'Higher counts point to areas that should be reviewed first.'
  },
  ndviScore: {
    name: 'NDVI Score',
    meaning: 'Vegetation health score for a field or farm.',
    calculation: 'In this prototype, NDVI is simulated from field health indicators and saved vegetation values, not live satellite imagery.',
    interpretation: 'Values closer to 1.00 indicate stronger vegetation. Lower values indicate possible crop stress.'
  },
  vegetationClassification: {
    name: 'Vegetation Classification',
    meaning: 'Plain-language category for vegetation condition.',
    calculation: 'Assigned from the simulated NDVI score using thresholds such as Excellent, Good, Moderate, Poor, and Critical.',
    interpretation: 'Poor or Critical fields should be reviewed first.'
  },
  trend: {
    name: 'Trend',
    meaning: 'Direction of recent vegetation performance.',
    calculation: 'Derived from the simulated NDVI trend model based on current field health.',
    interpretation: 'Improving is positive, Stable is steady, and Declining may require inspection.'
  },
  atRiskFields: {
    name: 'At-Risk Fields',
    meaning: 'Fields with weak vegetation condition.',
    calculation: 'Counts fields classified as Poor or Critical in the simulated NDVI model.',
    interpretation: 'These fields should be inspected or monitored closely.'
  },
  healthyFields: {
    name: 'Healthy Fields',
    meaning: 'Fields with strong vegetation condition.',
    calculation: 'Counts fields classified as Excellent or Good in the simulated NDVI model.',
    interpretation: 'These fields are performing well based on current indicators.'
  },
  revenue: {
    name: 'Revenue',
    meaning: 'Money earned by the operation.',
    calculation: 'Sums financial records marked as Income in the selected scope.',
    interpretation: 'Higher revenue is positive, but it should be compared with expenses and profit.'
  },
  expenses: {
    name: 'Expenses',
    meaning: 'Money spent by the operation.',
    calculation: 'Sums financial records marked as Expense in the selected scope.',
    interpretation: 'High expenses may be normal during active operations, but should be reviewed against revenue.'
  },
  profit: {
    name: 'Profit',
    meaning: 'Financial result after costs.',
    calculation: 'Revenue minus expenses.',
    interpretation: 'Positive profit indicates financial gain. Negative profit indicates a loss.'
  },
  profitMargin: {
    name: 'Profit Margin',
    meaning: 'Profit as a percentage of revenue.',
    calculation: 'Net profit divided by revenue, multiplied by 100.',
    interpretation: 'Higher margin means more revenue remains after expenses.'
  },
  pendingPayments: {
    name: 'Pending Payments',
    meaning: 'Financial records that still need payment attention.',
    calculation: 'Counts records marked as Pending or Overdue in the selected financial scope.',
    interpretation: 'Higher values mean more payments need follow-up.'
  },
  topExpenseCategories: {
    name: 'Top Expense Categories',
    meaning: 'Largest cost drivers in the selected financial scope.',
    calculation: 'Groups expense records by category and ranks them by total amount.',
    interpretation: 'Use this to identify where most operating costs are coming from.'
  },
  activeSignals: {
    name: 'Active Signals',
    meaning: 'Operational signals that are currently open.',
    calculation: 'Counts Operations Center signals with Active status.',
    interpretation: 'Active signals should be reviewed and resolved when addressed.'
  },
  criticalAlerts: {
    name: 'Critical Alerts',
    meaning: 'Highest-priority operational signals.',
    calculation: 'Counts active signals with Critical priority.',
    interpretation: 'Critical alerts should be handled first.'
  },
  highPriority: {
    name: 'High Priority',
    meaning: 'Important active operational signals.',
    calculation: 'Counts active signals with High priority.',
    interpretation: 'High-priority items need prompt review.'
  },
  resolvedSignals: {
    name: 'Resolved',
    meaning: 'Signals that have been marked as handled.',
    calculation: 'Counts Operations Center signals with Resolved status.',
    interpretation: 'Resolved signals remain available as operational history.'
  },
  priority: {
    name: 'Priority',
    meaning: 'Urgency level assigned to an operational signal.',
    calculation: 'Determined by the rule that created the signal, based on risk severity.',
    interpretation: 'Critical and High items should be reviewed before Medium and Low items.'
  },
  status: {
    name: 'Status',
    meaning: 'Whether a signal is still open or has been handled.',
    calculation: 'Signals are Active until marked as Resolved.',
    interpretation: 'Use status filters to focus on current work or review history.'
  }
};
