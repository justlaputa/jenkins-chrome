/** json job status color:
 * "aborted"
 * "aborted_anime"
 * "blue"
 * "blue_anime"
 * "disabled"
 * "grey"
 * "red"
 * "red_anime"
 * "yellow"
 * "yellow_anime"
 */

$(function() {

  var color_map = {
    'aborted': {
      status: 'aborted',
      type: 'inverse'
    },
    'blue': {
      status: 'succeed',
      type: 'success'
    },
    'disabled': {
      status: 'disabled',
      type: 'inverse'
    },
    'grey': {
      status: 'pending',
      type: 'info'
    },
    'red': {
      status: 'failed',
      type: 'error'
    },
    'yellow': {
      status: 'unstable',
      type: 'warning'
    },
    'notbuilt': {
      status: 'aborted',
      type: 'inverse'
    },
    'unknown': {
      status: 'aborted',
      type: 'inverse'
    }
  },

  refreshTimerId = null;

  function processData(jenkins_data) {
    var counts = {
      'total': 0,
      'aborted': 0,
      'succeed': 0,
      'disabled': 0,
      'pending': 0,
      'failed': 0,
      'unstable': 0,
      'in_progress': 0,
      'watched': 0
    };

    jenkins_data.forEach(function(data) {
      data['jobs'].forEach(function(job) {

        if (!job.color) job.color = 'unknown';
        if (job.color.search(/_anime$/) !== -1) {
          counts.in_progress++;
          job.in_progress = true;
          job.color = job.color.replace('_anime', '');
        }

        if (job.watched) {
          counts.watched++;
        }

        job.color_type = color_map[job.color].type;
        job.status = color_map[job.color].status;

        counts[job.status]++;
        counts.total++;
      });
    });
    return counts;
  }

  function showJobsInStatus(status) {
    var jobs = $('.job');

    if (status === 'all') {
      jobs.removeClass('hide');
    } else {
      jobs.addClass('hide').filter('.' + status).removeClass('hide');
    }
  }

  function showLoadingSpin(show) {
    $('#loading-spin').toggleClass('hide', show === false);
  }

  function showJobList(show) {
    $('#jobs-toolbar').toggleClass('hide', show === false);
    $('#job-list').toggleClass('hide', show === false);
  }

  function renderJenkinsJobs(data, counts) {
    $('#job-list').html(templates['joblist'](data));
    $('#jobs-toolbar').html(templates['jobstoolbar'](counts));
  }

  function showLoadingJenkinsFail() {
    $('#job-list').text('fail to load');
  }

  function setRefreshButton(text, spin) {
    var $timer = $('#jobs-toolbar .refresh .timer'),
    $icon = $('#jobs-toolbar .refresh i');

    $timer.text(text);
    $icon.toggleClass('icon-spin', spin);
  }

  function resetTimer(time) {
    if (refreshTimerId) {
      clearInterval(refreshTimerId);
    }

    refreshTimerId = setInterval(function() {
      var min = 0,
      sec = 0;

      time--;

      min = Math.floor(time / 60);
      sec = time % 60;

      if (time <=0) {
        setRefreshButton('Loading...', true);
      } else {
        setRefreshButton(min + ':' + sec, false);
      }
    }, 1000);
  }

  $(document).on('click', '#jobs-toolbar .filter button', function() {
    var status = $(this).attr('title');

    showJobsInStatus(status);
  });

  $(document).on('click', '#jobs-toolbar .refresh button', function() {
    chrome.runtime.getBackgroundPage(function(backend) {
      clearInterval(refreshTimerId);
      backend.refresh();
    });
  });

  $(document).on('click', '#job-list table td.name span', function() {
    chrome.tabs.create({url: $(this).data('href')});
  });

  $(document).on('click', '#job-list td.watch .watch-btn', function() {
    var job = $(this).closest('.job'),
    jobName = job.find('td.name span:last').text();

    job.toggleClass('watched');

    chrome.runtime.getBackgroundPage(function(backend) {
      backend.toggleWatch(jobName, job.hasClass('watched'));
    });
  });

  function showJenkinsJobs(data) {
    console.log(data);
    var counts = processData(data);

    showLoadingSpin(false);
    showJobList();

    renderJenkinsJobs(data, counts);
  }

  // get data from backend and register event listener
  chrome.runtime.getBackgroundPage(function(backend) {
    backend.on('data', function(data) {
      showJenkinsJobs(data);

      backend.getNextRefreshTime(function(time) {
        resetTimer(time);
      });
    });

    backend.on('loading', function() {
      setRefreshButton('Loading...', true);
    });

    backend.getData(function(data) {
      if (data) {
        showJenkinsJobs(data);
      } else {
        showLoadingSpin();
      }
    });

    backend.getNextRefreshTime(function(time) {
      resetTimer(time);
    });
  });
});
