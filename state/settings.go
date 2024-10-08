package state

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

func getEnv(key string) string {
	val, exists := os.LookupEnv(key)
	if !exists {
		panic("Missing environment variable: " + key)
	}
	return val
}

func strToInt(s string) int {
	val, _ := strconv.Atoi(s)
	return val
}

func strToBool(s string) bool {
	val, _ := strconv.ParseBool(s)
	return val
}

type Settings struct {
	APP_PORT          int
	APP_COOKIE_SECRET string
	APP_HANAYO_KEY    string

	APP_ENV string

	APP_INTERNAL_AVATARS_PATH string
	APP_INTERNAL_BANNERS_PATH string

	APP_BASE_URL   string
	APP_AVATAR_URL string
	APP_API_URL    string
	APP_BANCHO_URL string

	BEATMAP_MIRROR_API_URL      string
	BEATMAP_DOWNLOAD_MIRROR_URL string

	DISCORD_SERVER_URL string

	DISCORD_APP_CLIENT_ID     string
	DISCORD_APP_CLIENT_SECRET string

	DB_SCHEME string
	DB_HOST   string
	DB_PORT   int
	DB_USER   string
	DB_PASS   string
	DB_NAME   string

	REDIS_MAX_CONNECTIONS int
	REDIS_NETWORK_TYPE    string
	REDIS_HOST            string
	REDIS_PORT            int
	REDIS_PASS            string
	REDIS_DB              int
	REDIS_USE_SSL         bool

	MAILGUN_DOMAIN     string
	MAILGUN_API_KEY    string
	MAILGUN_PUBLIC_KEY string
	MAILGUN_FROM       string

	RECAPTCHA_SITE_KEY   string
	RECAPTCHA_SECRET_KEY string

	IP_LOOKUP_URL           string
	DISCORD_USER_LOOKUP_URL string

	PAYPAL_EMAIL_ADDRESS string
}

var settings = Settings{}

func LoadSettings() Settings {
	godotenv.Load()

	settings.APP_PORT = strToInt(getEnv("APP_PORT"))
	settings.APP_COOKIE_SECRET = getEnv("APP_COOKIE_SECRET")
	settings.APP_HANAYO_KEY = getEnv("APP_HANAYO_KEY")

	settings.APP_ENV = getEnv("APP_ENV")

	settings.APP_INTERNAL_AVATARS_PATH = getEnv("APP_INTERNAL_AVATARS_PATH")
	settings.APP_INTERNAL_BANNERS_PATH = getEnv("APP_INTERNAL_BANNERS_PATH")

	settings.APP_BASE_URL = getEnv("APP_BASE_URL")
	settings.APP_AVATAR_URL = getEnv("APP_AVATAR_URL")
	settings.APP_API_URL = getEnv("APP_API_URL")
	settings.APP_BANCHO_URL = getEnv("APP_BANCHO_URL")

	settings.BEATMAP_MIRROR_API_URL = getEnv("BEATMAP_MIRROR_API_URL")
	settings.BEATMAP_DOWNLOAD_MIRROR_URL = getEnv("BEATMAP_DOWNLOAD_MIRROR_URL")

	settings.DISCORD_SERVER_URL = getEnv("DISCORD_SERVER_URL")

	settings.DISCORD_APP_CLIENT_ID = getEnv("DISCORD_APP_CLIENT_ID")
	settings.DISCORD_APP_CLIENT_SECRET = getEnv("DISCORD_APP_CLIENT_SECRET")

	settings.DB_SCHEME = getEnv("DB_SCHEME")
	settings.DB_HOST = getEnv("DB_HOST")
	settings.DB_PORT = strToInt(getEnv("DB_PORT"))
	settings.DB_USER = getEnv("DB_USER")
	settings.DB_PASS = getEnv("DB_PASS")
	settings.DB_NAME = getEnv("DB_NAME")

	settings.REDIS_MAX_CONNECTIONS = strToInt(getEnv("REDIS_MAX_CONNECTIONS"))
	settings.REDIS_NETWORK_TYPE = getEnv("REDIS_NETWORK_TYPE")
	settings.REDIS_HOST = getEnv("REDIS_HOST")
	settings.REDIS_PORT = strToInt(getEnv("REDIS_PORT"))
	settings.REDIS_PASS = getEnv("REDIS_PASS")
	settings.REDIS_DB = strToInt(getEnv("REDIS_DB"))
	settings.REDIS_USE_SSL = strToBool(getEnv("REDIS_USE_SSL"))

	settings.MAILGUN_DOMAIN = getEnv("MAILGUN_DOMAIN")
	settings.MAILGUN_API_KEY = getEnv("MAILGUN_API_KEY")
	settings.MAILGUN_PUBLIC_KEY = getEnv("MAILGUN_PUBLIC_KEY")
	settings.MAILGUN_FROM = getEnv("MAILGUN_FROM")

	settings.RECAPTCHA_SITE_KEY = getEnv("RECAPTCHA_SITE_KEY")
	settings.RECAPTCHA_SECRET_KEY = getEnv("RECAPTCHA_SECRET_KEY")

	settings.IP_LOOKUP_URL = getEnv("IP_LOOKUP_URL")
	settings.DISCORD_USER_LOOKUP_URL = getEnv("DISCORD_USER_LOOKUP_URL")

	settings.PAYPAL_EMAIL_ADDRESS = getEnv("PAYPAL_EMAIL_ADDRESS")

	return settings
}

func GetSettings() Settings {
	return settings
}
