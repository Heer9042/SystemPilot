use crate::db::Database;

pub fn run_migrations(_db: &Database) -> Result<(), String> {
    // Database schema is initialized upon Database::init
    Ok(())
}
