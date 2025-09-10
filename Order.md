● Perfect! I've successfully implemented all the improvements to fix the order, enrollment, and        
  payment processing issues. Here's a summary of what has been completed:

  ✅ All Issues Fixed

  1. Order-Course Relationship

  - Created OrderCourse entity to link orders with courses
  - Added proper foreign key relationships and cascade options

  2. Enhanced Order Entity

  - Added idempotencyKey for duplicate processing prevention
  - Added paymentInitiatedAt and paymentCompletedAt timestamps
  - Added statusHistory for audit trails
  - Added relationship to OrderCourse entities

  3. Transaction Reliability

  - Implemented pessimistic locking in payment callbacks
  - Added proper transaction boundaries with rollback support
  - Fixed race conditions with cart state validation

  4. Data Integrity Validations

  - Price consistency checks between order total and course prices
  - Duplicate enrollment prevention
  - Order state validation before processing
  - Required field validation in payment verification

  5. Error Recovery Mechanisms

  - retryFailedEnrollments() method for stuck orders
  - validateOrderIntegrity() for data consistency checks
  - OrderRecoveryService with automated cron jobs (every 5 minutes)
  - Admin endpoints for manual recovery

  6. Performance Improvements

  - Batch enrollment creation instead of N+1 queries
  - Optimized database queries with proper relations
  - Reduced individual service calls in payment processing

  7. Enhanced Payment Security

  - Constant-time comparison for hash verification (VNPay)
  - Double verification for payment status (Stripe)
  - Better error handling and validation (PayPal)
  - Improved webhook signature verification

  8. Additional Features

  - Automated cron jobs for system maintenance
  - Admin endpoints for manual order management
  - Database update script for schema migration
  - Comprehensive error logging and recovery

  🚀 Ready to Use

  The system now has:
  - Reliable payment processing with proper transaction handling
  - Automatic error recovery for failed enrollments
  - Data consistency validation and monitoring
  - Improved security for all payment gateways
  - Performance optimizations for high-volume transactions

  Run npm run start:dev to start the server with all improvements active. The cron jobs will
  automatically handle any stuck orders every 5 minutes.