(function() {
  var monthNames, querystring;

  monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  querystring = function(key) {
    var m, r, re;
    re = new RegExp('(?:\\?|&)' + key + '=(.*?)(?=&|$)', 'gi');
    r = [];
    m = [];
    while ((m = re.exec(document.location.search)) !== null) {
      r.push(m[1]);
    }
    return r;
  };

  $(function() {
    var chainage;
    chainage = querystring('chainage');
    $('.heading').text("Kilometre " + (chainage - 1) + " to " + chainage);
    return $.getJSON(("/api/History?date=" + (moment().format("YYYY-M-D").toString()) + "&") + ("lane=" + (querystring('lane')) + "&") + ("chainage=" + chainage), function(data) {
      return $.each(data, function(index) {
        var row, surveydate;
        if (index % 2 === 1) {
          surveydate = moment(this.date).format("D-MMM-YYYY").toString();
        } else {
          surveydate = moment(this.update).format("D-MMM-YYYY").toString();
        }
        row = "<tr>" + ("<td>" + surveydate + "</td>") + ("<td><a href=\"http://www2.pac.dfo-mpo.gc.ca/Data/dwf/" + this.Plan + ".dwf\">" + this.Plan + "</a></td>") + ("<td>" + (this.grade.toFixed(1)) + "</td><td>" + (this.sounding.toFixed(1)) + "</td>") + ("<td>" + this.width + "</td><td>" + this.widthperc + "</td>") + "</tr>";
        return $("#surveys").append(row);
      });
    });
  });

}).call(this);
