export function validateFolderName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Folder name cannot be empty' };
  }

  if (trimmed.length > 256) {
    return { valid: false, error: 'Folder name must be 256 characters or less' };
  }

  if (trimmed.startsWith('/')) {
    return { valid: false, error: 'Folder name cannot start with /' };
  }

  if (trimmed.endsWith('/')) {
    return { valid: false, error: 'Folder name cannot end with /' };
  }

  if (trimmed.includes('//')) {
    return { valid: false, error: 'Folder name cannot contain //' };
  }

  if (trimmed.includes('\\')) {
    return { valid: false, error: 'Folder name cannot contain backslashes' };
  }

  if (trimmed === '.' || trimmed === '..') {
    return { valid: false, error: 'Folder name cannot be "." or ".."' };
  }

  const invalidChars = /[<>"|?*:]/;
  if (invalidChars.test(trimmed)) {
    return { valid: false, error: 'Folder name contains invalid characters: < > " | ? * :' };
  }

  return { valid: true };
}
