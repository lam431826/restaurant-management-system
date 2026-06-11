package com.rms.restaurant.common.utils.exception;

public class ForbiddenException extends ApplicationException {

    public ForbiddenException(ApplicationError error) {
        super(error);
    }

    public ForbiddenException(ApplicationError error, String message) {
        super(error, message);
    }
}
