package com.rms.restaurant.common.utils.exception;

public class ResourceNotFoundException extends ApplicationException {

    public ResourceNotFoundException(ApplicationError error) {
        super(error);
    }

    public ResourceNotFoundException(ApplicationError error, String message) {
        super(error, message);
    }
}
