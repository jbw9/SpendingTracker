erDiagram
    USER ||--o{ SAVED_SEARCH : saves
    AIRLINE ||--o{ FLIGHT : operates
    AIRPORT ||--o{ FLIGHT : origin_of
    AIRPORT ||--o{ FLIGHT : destination_of
    AIRPORT ||--o{ WEATHER_OBSERVATION : has
    ROUTE ||--o{ FLIGHT : includes
    ROUTE ||--o{ ONTIME_STAT : aggregates
    AIRLINE ||--o{ ONTIME_STAT : aggregates
    PRICE_QUOTE }o--|| ROUTE : for
    PRICE_QUOTE }o--|| AIRLINE : by
    PRICE_QUOTE }o--o{ USER : viewed_by

    USER {
      INT user_id PK
      VARCHAR(100) email
      VARCHAR(80) display_name
      TIMESTAMP created_at
    }

    SAVED_SEARCH {
      INT saved_search_id PK
      INT user_id FK
      VARCHAR(3) origin_airport
      VARCHAR(3) dest_airport
      DATE travel_date
      VARCHAR(10) preferred_carrier
      TIMESTAMP saved_at
    }

    AIRLINE {
      VARCHAR(3) carrier_code PK
      VARCHAR(120) carrier_name
    }

    AIRPORT {
      VARCHAR(3) airport_code PK
      VARCHAR(120) airport_name
      VARCHAR(64) city
      VARCHAR(2) state
      VARCHAR(32) tz_name
      INT gmt_offset_minutes
      DECIMAL(9,6) latitude
      DECIMAL(9,6) longitude
    }

    ROUTE {
      INT route_id PK
      VARCHAR(3) origin_airport FK
      VARCHAR(3) dest_airport FK
    }

    FLIGHT {
      BIGINT flight_id PK
      DATE flight_date
      VARCHAR(3) carrier_code FK
      VARCHAR(3) origin_airport FK
      VARCHAR(3) dest_airport FK
      INT route_id FK
      VARCHAR(10) flight_number
      TIME sched_dep_local
      TIME sched_arr_local
      INT dep_delay_minutes
      INT arr_delay_minutes
      VARCHAR(20) cancel_code
      VARCHAR(20) delay_primary_cause
    }

    WEATHER_OBSERVATION {
      BIGINT weather_id PK
      VARCHAR(3) airport_code FK
      TIMESTAMP obs_time_utc
      DECIMAL(4,1) temp_c
      DECIMAL(4,1) wind_kt
      DECIMAL(4,1) vis_km
      VARCHAR(16) precip_type
      BOOLEAN severe_flag
    }

    ONTIME_STAT {
      BIGINT stat_id PK
      INT route_id FK
      VARCHAR(3) carrier_code FK
      SMALLINT day_of_year
      SMALLINT hour_of_day_local
      INT sample_size
      DECIMAL(5,4) pct_on_time
      DECIMAL(6,2) avg_arr_delay_min
      DECIMAL(6,2) p90_arr_delay_min
    }

    PRICE_QUOTE {
      BIGINT quote_id PK
      INT route_id FK
      VARCHAR(3) carrier_code FK
      DATE travel_date
      TIMESTAMP quoted_at
      DECIMAL(10,2) price_usd
    }
