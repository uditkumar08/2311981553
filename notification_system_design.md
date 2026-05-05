# Campus Notification System Design

Complete system design covering API design, database optimization, scaling strategies, and background processing for a notification platform serving 50,000+ students.

## Stage 1: REST API Design

Reference: image_1db5c0.png

### Endpoint 1: Fetch Unread Notifications

**Request**

```
GET /api/notifications/unread
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
```

**Response (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "notif_001",
      "studentId": 1042,
      "type": "Placement",
      "title": "Placement Drive Scheduled",
      "message": "Microsoft is conducting interviews on campus this Friday",
      "timestamp": "2026-05-05T10:30:00Z",
      "isRead": false,
      "priority": 3,
      "metadata": {
        "company": "Microsoft",
        "date": "2026-05-10"
      }
    }
  ],
  "count": 1
}
```

**Error Response (401 Unauthorized)**

```json
{
  "success": false,
  "error": "Invalid or missing authorization token"
}
```

---

### Endpoint 2: Send New Notification

**Request**

```
POST /api/notifications/send
Headers:
  Authorization: Bearer <ADMIN_TOKEN>
  Content-Type: application/json

Body:
{
  "studentIds": [1042, 1043, 1044],
  "type": "Event",
  "title": "Tech Summit 2026",
  "message": "Join us for the annual tech summit next week",
  "priority": 2,
  "metadata": {
    "eventDate": "2026-05-15",
    "location": "Main Auditorium"
  }
}
```

**Response (201 Created)**

```json
{
  "success": true,
  "data": {
    "notificationId": "notif_002",
    "message": "Notification created and queued for delivery",
    "recipientsCount": 3,
    "estimatedDeliveryTime": "2026-05-05T10:35:00Z"
  }
}
```

**Error Response (400 Bad Request)**

```json
{
  "success": false,
  "error": "Invalid notification payload: missing required fields"
}
```

---

## Stage 2: Database Schema

PostgreSQL schema optimized for notification storage and retrieval.

```sql
CREATE TABLE notifications (
  notificationId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  readAt TIMESTAMP NULL,
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1
);

CREATE TABLE notification_types (
  typeId SERIAL PRIMARY KEY,
  typeName VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  defaultPriority INTEGER DEFAULT 1
);

-- Sample data
INSERT INTO notification_types (typeName, defaultPriority) VALUES
  ('Placement', 3),
  ('Result', 2),
  ('Event', 1);
```

---

## Stage 3: SQL Optimization and Indexing

### Original Slow Query

```sql
SELECT * FROM notifications
WHERE studentId = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

### Performance Analysis

**Problem Identified:**

- Full table scan for every query
- No index on studentId and isRead combination
- Large datasets (50,000+ students) result in O(n) operations
- Sorting on createdAt without index forces in-memory sort

### Optimized Query with Indexing

```sql
-- Composite index on (studentId, isRead) with createdAt included
CREATE INDEX idx_notifications_student_unread
ON notifications(studentId, isRead DESC, createdAt DESC);

-- This transforms the query to O(log n) with index scan
-- Query remains identical:
SELECT * FROM notifications
WHERE studentId = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

### Why Not Index Every Column?

Indexing every column is counterproductive:

1. **Write Performance Degradation**: Every INSERT/UPDATE/DELETE requires updating ALL indexes
2. **Storage Overhead**: Each index consumes disk space (typically 10-15% per index)
3. **Query Planner Confusion**: Too many indexes slow down query optimization
4. **Cache Invalidation**: More indexes mean more cache misses
5. **Maintenance Burden**: Rebuilding/analyzing multiple indexes consumes resources

### Recommended Index Strategy

```sql
-- Only create indexes on columns used in WHERE/JOIN/ORDER BY clauses

-- Index 1: Student-specific queries (most common)
CREATE INDEX idx_student_unread
ON notifications(studentId, isRead, createdAt DESC);

-- Index 2: Type-based queries
CREATE INDEX idx_notification_type
ON notifications(type, createdAt DESC);

-- Index 3: Bulk read operations
CREATE INDEX idx_created_at
ON notifications(createdAt DESC)
WHERE isRead = false;

-- Partial index: Only on unread notifications (smaller, faster)
CREATE INDEX idx_unread_notifications
ON notifications(studentId, createdAt DESC)
WHERE isRead = false;
```

### Index Maintenance

```sql
-- Regular maintenance (weekly)
ANALYZE notifications;
REINDEX INDEX idx_notifications_student_unread;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'notifications'
ORDER BY idx_scan DESC;
```

---

## Stage 4: Scaling Strategy for 50,000 Concurrent Users

### Challenge

- 50,000 students fetching notifications simultaneously
- Database connection pool exhaustion
- Memory overflow from query results
- Request timeout issues

### Solution: Redis Caching Layer

```
Client Request
    ↓
Redis Cache (1st check)
    ↓ (Cache hit: return immediately)
    ↓ (Cache miss: query DB)
Database Query
    ↓
Populate Redis Cache
    ↓
Return to Client
```

### Redis Configuration

```javascript
// Redis cache strategy pseudocode

// Cache key structure: notifications:{studentId}:unread
// TTL: 5 minutes for unread, 1 hour for read

getCachedNotifications(studentId):
  cacheKey = "notifications:" + studentId + ":unread"
  cachedData = redis.get(cacheKey)

  if cachedData is not null:
    return cachedData (O(1) operation)

  // Cache miss - query database
  notifications = queryDatabase(studentId, isRead=false)

  // Store in cache with 5-minute TTL
  redis.setex(cacheKey, 300, JSON.stringify(notifications))

  return notifications

// Invalidate cache on new notification
onNewNotification(studentId, notification):
  cacheKey = "notifications:" + studentId + ":unread"
  redis.delete(cacheKey)  // Invalidate stale cache

  // Notify client via WebSocket (real-time)
  broadcastToStudent(studentId, notification)
```

### Benefits

- 50,000 requests → 95% hit rate from Redis cache
- Response time: 5ms (Redis) vs 100-500ms (Database)
- Database load reduced by 80%
- Memory: ~100MB for 50,000 cached user sessions

---

## Stage 5: Background Processing with Message Queue

### Challenge

- Broadcasting notifications to 50,000 students crashes the server
- Direct loop causes memory spike and long-running requests

### Solution: BullMQ/RabbitMQ Message Queue

```javascript
// Pseudocode for "Notify All" feature using BullMQ

// Job Queue Configuration
const notificationQueue = new Queue("notifications", {
  redis: { host: "localhost", port: 6379 },
});

// Producer: Add jobs to queue (non-blocking)
async function notifyAll(notificationData) {
  try {
    const studentIds = await fetchAllStudentIds();

    // Add jobs in batches to prevent memory spike
    const batchSize = 1000;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);

      for (const studentId of batch) {
        await notificationQueue.add(
          "send",
          {
            studentId: studentId,
            message: notificationData,
            timestamp: Date.now(),
          },
          {
            attempts: 3, // Retry 3 times on failure
            backoff: {
              type: "exponential",
              delay: 2000, // Start with 2s delay
            },
            removeOnComplete: true, // Clean up completed jobs
          },
        );
      }
    }

    return {
      success: true,
      message: "Notification jobs queued",
      totalJobs: studentIds.length,
    };
  } catch (error) {
    throw new Error("Failed to queue notifications: " + error.message);
  }
}

// Consumer: Process jobs from queue (worker process)
notificationQueue.process("send", 5, async (job) => {
  try {
    const { studentId, message } = job.data;

    // Send notification via external service
    await sendNotificationToService({
      studentId: studentId,
      message: message,
      timestamp: new Date().toISOString(),
    });

    // Invalidate Redis cache for this student
    await redis.delete("notifications:" + studentId + ":unread");

    // Update job progress (for UI tracking)
    job.progress(100);

    return { success: true, studentId };
  } catch (error) {
    throw new Error("Job failed: " + error.message);
  }
});

// Event listeners for monitoring
notificationQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed for student ${job.data.studentId}`);
});

notificationQueue.on("failed", (job, error) => {
  console.error(`Job ${job.id} failed: ${error.message}`);
});
```

### Architecture Flow

```
Request to /notify-all
    ↓
Producer adds 50,000 jobs to queue (1-2 seconds)
    ↓
Returns immediately to client
    ↓
5 worker processes consume jobs in parallel
    ↓
Each worker sends notifications asynchronously
    ↓
Jobs retry automatically on failure
    ↓
Server never blocks or crashes
```

### Performance Comparison

**Direct Loop (BAD)**

- Memory usage: ~500MB
- Response time: 2-5 minutes
- Server becomes unresponsive
- Single point of failure

**Message Queue (GOOD)**

- Memory usage: ~50MB (constant)
- Response time: 1-2 seconds
- Server remains responsive
- Automatic retries and monitoring
- Can scale horizontally (add more workers)

### Scaling Message Queue

```javascript
// Add more worker processes for higher throughput
// Process A: 5 workers
// Process B: 5 workers
// Process C: 5 workers
// Total: 15 parallel workers processing 50,000 jobs

// Estimated time with 15 workers: 3,500 messages/sec = ~14 seconds for 50,000
```

---

## Summary

This design supports:

- Immediate response for cache hits (95% of requests)
- Database queries only for cache misses
- Non-blocking background job processing
- Horizontal scaling with multiple workers
- Automatic retry logic for failed notifications
- Real-time updates via WebSocket
- 50,000+ concurrent users without service degradation