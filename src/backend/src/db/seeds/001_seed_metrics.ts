/**
 * @fileoverview Database seed file for populating the metrics table with core SaaS metrics
 * Implements comprehensive error handling and transaction support for reliable seeding
 * @version 1.0.0
 */

import { Knex } from 'knex'; // v2.4.0
import { v4 } from 'uuid'; // v9.0.0
import { MetricType } from '../../interfaces/metrics.interface';

// Table name constant for consistency
const TABLE_NAME = 'metrics';

/**
 * Core SaaS metrics seed data with comprehensive descriptions and calculation methods
 * Based on specifications from A.1.1 Metric Calculation Methods
 */
const SEED_DATA = [
  {
    id: v4(),
    name: 'Revenue Growth Rate',
    description: 'Measures the year-over-year growth in Annual Recurring Revenue (ARR). Key indicator of company expansion and market penetration rate.',
    type: MetricType.REVENUE_GROWTH,
    calculation_method: '((Current ARR - Previous ARR) / Previous ARR) × 100',
    created_at: Knex.fn.now(),
    updated_at: Knex.fn.now()
  },
  {
    id: v4(),
    name: 'Net Dollar Retention',
    description: 'Measures revenue retained from existing customers including expansions and contractions. Critical indicator of customer satisfaction and product stickiness.',
    type: MetricType.NDR,
    calculation_method: '((Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR) × 100',
    created_at: Knex.fn.now(),
    updated_at: Knex.fn.now()
  },
  {
    id: v4(),
    name: 'Magic Number',
    description: 'Measures sales efficiency by comparing new ARR to sales and marketing spend. Indicates effectiveness of go-to-market investments.',
    type: MetricType.MAGIC_NUMBER,
    calculation_method: 'Net New ARR / Sales & Marketing Spend',
    created_at: Knex.fn.now(),
    updated_at: Knex.fn.now()
  },
  {
    id: v4(),
    name: 'EBITDA Margin',
    description: "Measures operational profitability as a percentage of revenue. Indicates company's operational efficiency and scalability.",
    type: MetricType.EBITDA_MARGIN,
    calculation_method: '(EBITDA / Revenue) × 100',
    created_at: Knex.fn.now(),
    updated_at: Knex.fn.now()
  },
  {
    id: v4(),
    name: 'ARR per Employee',
    description: 'Measures revenue efficiency by comparing ARR to total employee count. Key indicator of organizational productivity and scalability.',
    type: MetricType.ARR_PER_EMPLOYEE,
    calculation_method: 'Total ARR / Full-time Employee Count',
    created_at: Knex.fn.now(),
    updated_at: Knex.fn.now()
  }
];

/**
 * Seeds the metrics table with initial core SaaS metrics
 * Implements transaction support for atomic operations and comprehensive error handling
 * 
 * @param knex - Knex instance for database operations
 * @returns Promise resolving when seeding is complete
 * @throws Error with detailed message if seeding fails
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operation
    await knex.transaction(async (trx) => {
      // Clear existing records
      await trx(TABLE_NAME).del();
      
      // Validate metric types before insertion
      SEED_DATA.forEach(metric => {
        if (!Object.values(MetricType).includes(metric.type)) {
          throw new Error(`Invalid metric type: ${metric.type} for metric: ${metric.name}`);
        }
      });

      // Insert seed data
      const insertResult = await trx(TABLE_NAME).insert(SEED_DATA);
      
      // Verify successful insertion
      if (!insertResult) {
        throw new Error('Failed to insert seed data into metrics table');
      }

      // Log successful seeding
      console.log(`Successfully seeded ${SEED_DATA.length} metrics`);
    });
  } catch (error) {
    // Comprehensive error handling with detailed logging
    console.error('Error seeding metrics table:', error);
    console.error('Seed data validation failed or database error occurred');
    console.error('Transaction rolled back automatically');
    throw error; // Re-throw for upstream handling
  }
}