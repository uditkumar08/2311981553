# Notification System Design

## Stage 1 – API Design

POST /notifications  
GET /notifications  
PATCH /notifications/:id  

---

## Stage 2 – DB Design

notifications(
  id,
  student_id,
  type,
  message,
  is_read,
  created_at
)

---

## Stage 3 – Optimization

Problem: slow query

Solution:
CREATE INDEX idx_student_read_created 
ON notifications(student_id, is_read, created_at DESC);

---

## Stage 4 – Scaling

- Redis caching
- Pagination
- Read replicas

---

## Stage 5 – Async Processing

Use Queue:
API → Queue → Worker → Email/SMS

---

## Stage 6 – Priority System

Use Max Heap

score = recency + type_weight