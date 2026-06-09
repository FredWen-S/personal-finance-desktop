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
        Migration {
            version: 5,
            description: "add_currency_settings",
            sql: include_str!("../migrations/005_add_currency_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "update_usd_cny_rate",
            sql: include_str!("../migrations/006_update_usd_cny_rate.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_credit_card_fields",
            sql: include_str!("../migrations/007_add_credit_card_fields.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_subscriptions",
            sql: include_str!("../migrations/008_add_subscriptions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_budgets",
            sql: include_str!("../migrations/009_add_budgets.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:finance.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
