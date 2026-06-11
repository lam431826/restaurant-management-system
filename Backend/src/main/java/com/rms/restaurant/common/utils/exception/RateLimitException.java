package com.rms.restaurant.common.utils.exception;

public class RateLimitException extends ApplicationException {

    public RateLimitException(ApplicationError error) {
        super(error);
    }

    public RateLimitException(ApplicationError error, String message) {
        super(error, message);
    }
}
