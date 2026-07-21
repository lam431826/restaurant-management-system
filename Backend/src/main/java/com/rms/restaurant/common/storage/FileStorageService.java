package com.rms.restaurant.common.storage;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores uploaded files on the local filesystem under {@code app.upload.dir}
 * and returns a public, relative URL (served via {@code /uploads/**}).
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_IMAGE_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

    private final Path root;

    public FileStorageService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Validates and stores an image, returning its public URL, e.g. {@code /uploads/menu/<uuid>.jpg}.
     */
    public String storeImage(MultipartFile file, String subfolder) {
        if (file == null || file.isEmpty()) {
            throw new ApplicationException(ApplicationError.IMAGE_UPLOAD_INVALID, "Image file is missing");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ApplicationException(ApplicationError.IMAGE_UPLOAD_INVALID, "Image exceeds the 5 MB limit");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new ApplicationException(ApplicationError.IMAGE_UPLOAD_INVALID,
                    "Unsupported image type; allowed: JPEG, PNG, WEBP, GIF");
        }

        String filename = UUID.randomUUID() + extensionFor(contentType, file.getOriginalFilename());
        try {
            Path targetDir = root.resolve(subfolder).normalize();
            if (!targetDir.startsWith(root)) {
                throw new ApplicationException(ApplicationError.INTERNAL_ERROR, "Invalid storage path");
            }
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(filename);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return "/uploads/" + subfolder + "/" + filename;
    }

    private String extensionFor(String contentType, String originalName) {
        String ext = StringUtils.getFilenameExtension(originalName);
        if (StringUtils.hasText(ext)) {
            return "." + ext.toLowerCase();
        }
        return switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };
    }
}
