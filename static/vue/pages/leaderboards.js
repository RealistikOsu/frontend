new Vue({
    el: "#app",
    delimiters: ["<%", "%>"],
    data() {
        return {
            data: {},
            mode: 'std',
            relax: 'vn',
            relaxInt: 0,
            modeInt: 0,
            sort: 'pp',
            load: false,
            page: 1,
            country: '',
        }
    },
    created() {
        this.loadLeaderboardData(sort, mode, relax, page, country)
    },
    methods: {
        loadLeaderboardData(sort, mode, relax, page, country) {
            var vm = this;
            if (window.event) {
                window.event.preventDefault();
            }
            vm.load = true;
            vm.mode = mode;
            vm.relax = relax;
            switch (mode) {
                case 'taiko':
                    vm.modeInt = 1;
                    break
                case 'fruits':
                    vm.modeInt = 2;
                    break
                case 'mania':
                    vm.modeInt = 3;
                    break
                default:
                    vm.modeInt = 0;
            }

            switch (relax) {
                case 'rx':
                    vm.relaxInt = 1;
                    break;
                case 'ap':
                    vm.relaxInt = 2;
                    break;
                default:
                    vm.relaxInt = 0;
            }

            vm.sort = sort;
            vm.page = page;
            if (country == null)
                vm.country = ''
            else
                vm.country = country.toUpperCase()
            if (vm.page <= 0 || vm.page == null)
                vm.page = 1;
            window.history.replaceState('', document.title, `/leaderboard?m=${vm.mode}&rx=${vm.relax}&sort=${vm.sort}&p=${vm.page}&c=${vm.country}`);
            vm.$axios.get("https://ussr.pl/api/v1/leaderboard", {
                params: {
                    mode: vm.modeInt,
                    sort: vm.sort,
                    rx: vm.relaxInt,
                    p: vm.page,
                    country: vm.country,
                }
            })
                .then(function (response) {
                    vm.data = response.data.users;
                    vm.load = false;
                });
        },
        addCommas(integer) {
            integer += "", x = integer.split("."), x1 = x[0], x2 = x.length > 1 ? "." + x[1] : "";
            for (var t = /(\d+)(\d{3})/; t.test(x1);) x1 = x1.replace(t, "$1,$2");
            return x1 + x2;
        },
        convertIntToLabel(number) {
            // Nine Zeroes for Trillion
            return Math.abs(Number(number)) >= 1.0e+12

                ? (Math.abs(Number(number)) / 1.0e+12).toFixed(2) + " trillion"
                // Nine Zeroes for Billion 
                : Math.abs(Number(number)) >= 1.0e+9

                    ? (Math.abs(Number(number)) / 1.0e+9).toFixed(2) + " billion"
                    // Six Zeroes for Millions
                    : Math.abs(Number(number)) >= 1.0e+6

                        ? (Math.abs(Number(number)) / 1.0e+6).toFixed(2) + " million"
                        // Three Zeroes for Thousand
                        : Math.abs(Number(number)) >= 1.0e+3

                            ? (Math.abs(Number(number)) / 1.0e+3).toFixed(2) + " thousand"

                            : Math.abs(Number(number));
        },
        addOne(page) {
            return (parseInt(page) + parseInt(1));
        },
        mobileCheck() {

            if (window.innerWidth < 768) {
                return true;
            }

            return false;
        },
        countryName(str) {
            var getCountryNames = new Intl.DisplayNames(['en'], { type: 'region' });
            return getCountryNames.of(str.toUpperCase())
        }
    },
    computed: {
    }
});
