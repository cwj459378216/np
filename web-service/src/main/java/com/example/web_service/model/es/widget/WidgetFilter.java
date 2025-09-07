package com.example.web_service.model.es.widget;

public class WidgetFilter {
    private String field;
    private String operator; // exists, not_exists, eq, neq, gt, gte, lt, lte
    private String value; // optional

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
