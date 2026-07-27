package com.rms.restaurant.common.utils.audit;

import java.util.Objects;

/**
 * Hand-builds the `detail` JSON string for an {@code AuditService.log()} call, replacing
 * ad-hoc string concatenation in each {@code *ServiceImpl}. Two shapes only:
 * - {@link #field}: always emitted — for CREATE (every field set on the new row) and DELETE
 *   (identifying info about the removed row).
 * - {@link #changed}: emitted only when {@code from} and {@code to} differ — for UPDATE, one
 *   entry per field that actually changed, as {@code "field":{"from":X,"to":Y}}.
 * Not thread-safe; one instance per audit() call.
 */
public final class AuditDetailBuilder {

    private final StringBuilder sb = new StringBuilder("{");
    private boolean first = true;

    public static AuditDetailBuilder create() {
        return new AuditDetailBuilder();
    }

    public AuditDetailBuilder field(String key, String value) {
        appendKey(key).append(jsonString(value));
        return this;
    }

    public AuditDetailBuilder field(String key, Number value) {
        appendKey(key).append(jsonNumber(value));
        return this;
    }

    public AuditDetailBuilder field(String key, Boolean value) {
        appendKey(key).append(jsonBoolean(value));
        return this;
    }

    public AuditDetailBuilder changed(String key, String from, String to) {
        if (Objects.equals(from, to)) return this;
        appendKey(key).append("{\"from\":").append(jsonString(from))
                .append(",\"to\":").append(jsonString(to)).append('}');
        return this;
    }

    public AuditDetailBuilder changed(String key, Number from, Number to) {
        if (Objects.equals(from, to)) return this;
        appendKey(key).append("{\"from\":").append(jsonNumber(from))
                .append(",\"to\":").append(jsonNumber(to)).append('}');
        return this;
    }

    public AuditDetailBuilder changed(String key, Boolean from, Boolean to) {
        if (Objects.equals(from, to)) return this;
        appendKey(key).append("{\"from\":").append(jsonBoolean(from))
                .append(",\"to\":").append(jsonBoolean(to)).append('}');
        return this;
    }

    /** Enum overload so callers don't have to call .name() at every site. */
    public AuditDetailBuilder changed(String key, Enum<?> from, Enum<?> to) {
        return changed(key, from == null ? null : from.name(), to == null ? null : to.name());
    }

    public boolean isEmpty() {
        return first;
    }

    public String build() {
        return sb.toString() + '}';
    }

    private StringBuilder appendKey(String key) {
        if (!first) sb.append(',');
        first = false;
        return sb.append('"').append(key).append("\":");
    }

    private static String jsonString(String v) {
        return v == null ? "null" : "\"" + v.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String jsonNumber(Number v) {
        return v == null ? "null" : String.valueOf(v);
    }

    private static String jsonBoolean(Boolean v) {
        return v == null ? "null" : String.valueOf(v);
    }
}
