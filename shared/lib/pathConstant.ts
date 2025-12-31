import path from 'path';

const BASE_DIR = process.cwd();

export const UPLOAD_FILE_PATH = path.join(BASE_DIR, '.lumina/files')
export const DBBAKUP_PATH = path.join(BASE_DIR, '.lumina/pgdump')
export const ROOT_PATH = path.join(BASE_DIR, '.lumina')
export const EXPORT_BAKUP_PATH = path.join(BASE_DIR, 'backup')
export const TEMP_PATH = path.join(BASE_DIR, '.lumina/files/temp')
export const VECTOR_PATH = path.join(BASE_DIR, '.lumina/vector')
