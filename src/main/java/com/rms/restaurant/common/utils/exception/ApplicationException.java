package com.rms.restaurant.common.utils.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApplicationException extends RuntimeException {

    private final ApplicationError error;
    private final HttpStatus httpStatus;

    public ApplicationException(ApplicationError error) {
        super(error.getDefaultMessage());
        this.error = error;
        this.httpStatus = error.getHttpStatus();
    }

    public ApplicationException(ApplicationError error, String message) {
        super(message);
        this.error = error;
        this.httpStatus = error.getHttpStatus();
    }
}
