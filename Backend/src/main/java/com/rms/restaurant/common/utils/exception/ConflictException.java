package com.rms.restaurant.common.utils.exception;

public class ConflictException extends ApplicationException {

    public ConflictException(ApplicationError error) {
        super(error);
    }

    public ConflictException(ApplicationError error, String message) {
        super(error, message);
    }
}
