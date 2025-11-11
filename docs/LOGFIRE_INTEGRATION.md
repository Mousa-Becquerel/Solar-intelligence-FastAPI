# 🔐 Logfire Integration Guide

## Overview

This application now includes comprehensive observability using **Pydantic Logfire**, providing detailed monitoring for:

- **Flask HTTP requests** (automatic instrumentation)
- **LLM/Agent calls** (Pydantic AI instrumentation)
- **Custom business logic** (manual spans)
- **Performance metrics** and **error tracking**

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
pip install "logfire[flask]" "pydantic-ai[logfire]"
```

### 2. Authenticate with Logfire
```bash
logfire auth
```

### 3. Create/Use Project
```bash
# Create new project
logfire projects new

# Or use existing project
logfire projects use <project-name>
```

### 4. Start Application
```bash
python app.py
```

## 📊 What's Being Monitored

### 🔄 Automatic Instrumentation

#### **Flask Requests**
- All HTTP requests automatically traced
- Request/response timing
- Status codes and error tracking
- URL patterns and routing

#### **Pydantic AI Agent Calls**
- LLM model interactions
- Tool executions
- Agent reasoning steps
- Response generation timing

### 🎯 Custom Instrumentation

#### **Chat Requests**
```python
with logfire.span("chat_request") as span:
    span.set_attribute("user_id", current_user.id)
    span.set_attribute("agent_type", request.json.get('agent_type', 'market'))
```

#### **Agent Calls**
```python
with logfire.span("price_agent_call") as agent_span:
    agent_span.set_attribute("agent_type", "price")
    agent_span.set_attribute("conversation_id", str(conv_id))
    agent_span.set_attribute("message_length", len(user_message))
```

#### **Admin Operations**
```python
with logfire.span("admin_memory_cleanup") as span:
    span.set_attribute("user_id", current_user.id)
    span.set_attribute("memory_freed_mb", memory_freed)
```

## 📈 Dashboard Features

### **Request Tracing**
- Complete request flow visualization
- Database query timing
- External API calls
- Error propagation

### **Agent Performance**
- LLM response times
- Token usage tracking
- Model selection insights
- Prompt effectiveness

### **Memory Management**
- Memory usage trends
- Cleanup effectiveness
- Performance bottlenecks
- Resource optimization

### **User Activity**
- User interaction patterns
- Feature usage analytics
- Error rates by user
- Performance by user type

## 🛠️ Testing Integration

Run the test script to verify Logfire is working:

```bash
python test_logfire_integration.py
```

This will:
1. ✅ Test login functionality
2. ✅ Send chat messages to trigger spans
3. ✅ Test admin memory cleanup
4. ✅ Verify data is being sent to Logfire

## 🔍 Key Metrics to Monitor

### **Performance Metrics**
- Request latency (p50, p95, p99)
- Memory usage trends
- Database query performance
- Agent response times

### **Business Metrics**
- Chat messages per user
- Agent type usage distribution
- Error rates by feature
- User engagement patterns

### **Technical Metrics**
- Memory cleanup effectiveness
- LLM token consumption
- Database connection health
- Application uptime

## 🚨 Alerting Recommendations

### **Critical Alerts**
- Application errors > 5%
- Memory usage > 80%
- Agent response time > 30s
- Database connection failures

### **Warning Alerts**
- Memory usage > 60%
- Agent response time > 15s
- High error rates in specific features
- Unusual user activity patterns

## 📋 Configuration

### **Environment Variables**
```bash
# Required for production
export FLASK_SECRET_KEY="your-secret-key"

# Optional: Custom Logfire configuration
export LOGFIRE_ENVIRONMENT="production"
export LOGFIRE_SERVICE_NAME="pv-market-analysis"
```

### **Logfire Configuration**
The application uses default Logfire configuration. For custom settings:

```python
import logfire

logfire.configure(
    service_name="pv-market-analysis",
    environment="production",
    # Add custom configuration as needed
)
```

## 🔧 Troubleshooting

### **Common Issues**

1. **No data in Logfire dashboard**
   - Check authentication: `logfire auth`
   - Verify project selection: `logfire projects list`
   - Ensure application is running

2. **Missing spans**
   - Verify Logfire is imported: `import logfire`
   - Check instrumentation is enabled
   - Review error logs for configuration issues

3. **Performance impact**
   - Logfire has minimal overhead
   - Spans are sent asynchronously
   - No blocking operations

### **Debug Mode**
Enable debug logging for Logfire:

```python
import logging
logging.getLogger("logfire").setLevel(logging.DEBUG)
```

## 📚 Next Steps

### **Advanced Features**
- Custom metrics collection
- Business-specific alerts
- Performance optimization insights
- User behavior analytics

### **Integration with Other Tools**
- Grafana dashboards
- Slack notifications
- Custom alerting rules
- Performance benchmarking

## 🎯 Benefits

### **For Developers**
- Real-time debugging capabilities
- Performance bottleneck identification
- Error tracking and resolution
- User experience insights

### **For Operations**
- Proactive monitoring
- Capacity planning
- Incident response
- Performance optimization

### **For Business**
- User engagement analytics
- Feature usage insights
- Performance impact assessment
- ROI measurement

---

**🎉 Your application now has enterprise-grade observability with Logfire!** 