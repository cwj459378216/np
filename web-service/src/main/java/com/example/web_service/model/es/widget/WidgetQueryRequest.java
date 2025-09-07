package com.example.web_service.model.es.widget;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class WidgetQueryRequest {
    @JsonProperty("index")
    private String index; // alias or index
    
    @JsonProperty("widgetType")
    private String widgetType; // line, bar, pie, table
    
    @JsonProperty("aggregationField")
    private String aggregationField; // for charts
    
    @JsonProperty("aggregationType")
    private String aggregationType; // sum, avg, count, min, max
    
    @JsonProperty("metricField")
    private String metricField; // for pie charts with non-count aggregations
    
    @JsonProperty("yField")
    private String yField; // Y axis field for line/bar charts (time or category dimension)
    
    @JsonProperty("filters")
    private List<WidgetFilter> filters;
    
    @JsonProperty("startTime")
    private Long startTime; // epoch millis
    
    @JsonProperty("endTime")
    private Long endTime;   // epoch millis

    public String getIndex() { return index; }
    public void setIndex(String index) { this.index = index; }

    public String getWidgetType() { return widgetType; }
    public void setWidgetType(String widgetType) { this.widgetType = widgetType; }

    public String getAggregationField() { return aggregationField; }
    public void setAggregationField(String aggregationField) { this.aggregationField = aggregationField; }

    public String getAggregationType() { return aggregationType; }
    public void setAggregationType(String aggregationType) { this.aggregationType = aggregationType; }

    public String getMetricField() { return metricField; }
    public void setMetricField(String metricField) { this.metricField = metricField; }

    public String getYField() { return yField; }
    public void setYField(String yField) { this.yField = yField; }

    public List<WidgetFilter> getFilters() { return filters; }
    public void setFilters(List<WidgetFilter> filters) { this.filters = filters; }

    public Long getStartTime() { return startTime; }
    public void setStartTime(Long startTime) { this.startTime = startTime; }

    public Long getEndTime() { return endTime; }
    public void setEndTime(Long endTime) { this.endTime = endTime; }

    @Override
    public String toString() {
        return "WidgetQueryRequest{" +
                "index='" + index + '\'' +
                ", widgetType='" + widgetType + '\'' +
                ", aggregationField='" + aggregationField + '\'' +
                ", aggregationType='" + aggregationType + '\'' +
                ", metricField='" + metricField + '\'' +
                ", yField='" + yField + '\'' +
                ", filters=" + filters +
                ", startTime=" + startTime +
                ", endTime=" + endTime +
                '}';
    }
}
