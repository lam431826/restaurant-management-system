package com.rms.restaurant.common.utils.exception;

public class UnauthorizedException extends ApplicationException {

    public UnauthorizedException(ApplicationError error) {
        super(error);
    }

    public UnauthorizedException(ApplicationError error, String message) {
        super(error, message);
    }
}
