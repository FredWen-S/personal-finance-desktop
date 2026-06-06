use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_accounts_table",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_transactions_table",
            sql: include_str!("../migrations/002_add_transactions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_points_tables",
            sql: include_str!("../migrations/003_add_points.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_activities_table",
            sql: include_str!("../migrations/004_add_activities.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:finance.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
