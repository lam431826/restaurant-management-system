package com.rms.restaurant.common.utils.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<ErrorResponse> handleApplication(ApplicationException ex,
                                                           HttpServletRequest req) {
        log.warn("Application error [{}] at {}: {}", ex.getError().name(), req.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(ex.getHttpStatus())
                .body(ErrorResponse.of(ex.getError().name(), ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest req) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        return ResponseEntity
                .badRequest()
                .body(ErrorResponse.validation(req.getRequestURI(), fieldErrors));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                            HttpServletRequest req) {
        return ResponseEntity
                .status(403)
                .body(ErrorResponse.of("FORBIDDEN", "Access denied", req.getRequestURI()));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoHandlerFoundException ex,
                                                        HttpServletRequest req) {
        return ResponseEntity
                .status(404)
                .body(ErrorResponse.of("NOT_FOUND", "The requested resource was not found", req.getRequestURI()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex,
                                                          HttpServletRequest req) {
        return ResponseEntity
                .status(404)
                .body(ErrorResponse.of("NOT_FOUND", "Static resource not found", req.getRequestURI()));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex,
                                                                HttpServletRequest req) {
        return ResponseEntity
                .status(405)
                .body(ErrorResponse.of("METHOD_NOT_ALLOWED", "HTTP method '" + ex.getMethod() + "' is not supported for this endpoint", req.getRequestURI()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex,
                                                          HttpServletRequest req) {
        String msg = ex.getMessage() != null && ex.getMessage().contains("not one of the values accepted")
                ? "Invalid enum value: " + ex.getMessage().replaceAll("(?s).*\\[([^]]+)].*", "[$1]")
                : "Malformed or unreadable request body";
        return ResponseEntity
                .badRequest()
                .body(ErrorResponse.of("BAD_REQUEST", msg, req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleSystem(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception at {}", req.getRequestURI(), ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred";
        if (ex.getCause() != null) msg += " | Cause: " + ex.getCause().getMessage();
        return ResponseEntity
                .internalServerError()
                .body(ErrorResponse.of("INTERNAL_ERROR", msg, req.getRequestURI()));
    }

    public record ErrorResponse(String error, String message, String path, Instant timestamp,
                                Map<String, String> fieldErrors) {

        static ErrorResponse of(String error, String message, String path) {
            return new ErrorResponse(error, message, path, Instant.now(), null);
        }

        static ErrorResponse validation(String path, Map<String, String> fieldErrors) {
            return new ErrorResponse("VALIDATION_ERROR", "Validation failed", path, Instant.now(), fieldErrors);
        }
    }
}
