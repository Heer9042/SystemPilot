use std::path::Path;
use crate::db::Database;

pub fn open_database<P: AsRef<Path>>(path: P) -> Result<Database, String> {
    Database::init(path.as_ref().to_path_buf())
}
