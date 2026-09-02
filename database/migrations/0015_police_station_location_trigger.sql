-- Keep police_stations.location in sync with latitude/longitude automatically,
-- so the API layer only ever has to write/update two plain numeric columns and
-- the PostGIS geography column (used for GIST distance queries) never drifts.

CREATE OR REPLACE FUNCTION sync_police_station_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_police_station_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON police_stations
  FOR EACH ROW
  EXECUTE FUNCTION sync_police_station_location();
