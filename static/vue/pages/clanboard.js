new Vue({
    el: "#app",
    delimiters: ["<%", "%>"],
    data() {
        return {
            data : {},
            mode : 'std',
            relax : 'vn',
            relaxInt : 0,
            modeInt : 0,
            load : false,
            page: 1,
        }
    },
    created() {
        this.loadClanboardData(mode, relax, page)
    },
    // mounted() {
    //     document.onreadystatechange = () => { 
    //         if (document.readyState == "complete") { 
    //             this.keepBackgroundState();
    //         };
    //     };
    // },
    // updated() {
    //     this.keepBackgroundState();
    // },
    methods: {
        // keepBackgroundState() {
        //     var rows = document.getElementById("table-scores");
        //     var len = rows.rows.length;
        //     if (rows == null || page != 1 || len < 1) return;

        //     if (len > 0 && rows.rows[0].firstChild.innerText == "#1") {
        //         rows.rows[0].style.background = 'linear-gradient(-45deg, hsl(0,0%,18%) 92%, #FBBD08 100%)';
        //     } else if (len > 0) {
        //         rows.rows[0].style.background = ''
        //     }
        //     if (len > 1 && rows.rows[1].firstChild.innerText == "#2") {
        //         rows.rows[1].style.background = 'linear-gradient(-45deg, hsl(0,0%,18%) 92%, #767676 100%)';
        //     } else if (len > 1) {
        //         rows.rows[1].style.background = ''
        //     }
        //     if (len > 2 && rows.rows[2].firstChild.innerText == "#3") {
        //         rows.rows[2].style.background = 'linear-gradient(-45deg, hsl(0,0%,18%) 92%, #A5673F 100%)';
        //     } else if (len > 2) {
        //         rows.rows[2].style.background = ''
        //     }
        // },
        loadClanboardData(mode, relax, page) {
            var vm = this;
            if (window.event){
                window.event.preventDefault();
            }
            vm.load = true;
            vm.mode = mode;
            vm.relax = relax;
            switch(mode) {
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

            switch(relax) {
                case 'rx':
                    vm.relaxInt = 1;
                    break;
                case 'ap':
                    vm.relaxInt = 2;
                    break;
                default:
                    vm.relaxInt = 0;
            }

            vm.page = page;
            if (vm.page <= 0 || vm.page == null)
                vm.page = 1;
            window.history.replaceState('', document.title, `/clanboard?mode=${vm.mode}&rx=${vm.relax}&p=${vm.page}`);
            vm.$axios.get("https://ussr.pl/api/v1/clans/stats/all", { params: {
                m: vm.modeInt,
                rx: vm.relaxInt,
                p: vm.page,
            }})
            .then(function(response){
                vm.data = response.data.clans;
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
            let check = false;
            (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        },
    },
    computed: {
    }
});