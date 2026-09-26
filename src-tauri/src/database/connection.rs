use crate::db::Database;
use std::path::Path;

pub fn open_database<P: AsRef<Path>>(path: P) -> Result<Database, String> {
    Database::init(path.as_ref().to_path_buf())
}
