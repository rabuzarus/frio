/* 
 * The javascript for friendicas hovercard. Bootstraps popover is needed.
 * 
 * Much parts of the code are from Hannes Mannerheims <h@nnesmannerhe.im> 
 * qvitter code (https://github.com/hannesmannerheim/qvitter)
 * 
 * It is licensed under the GNU Affero General Public License <http://www.gnu.org/licenses/>
 * 
 */


$(document).ready(function(){

	// Elements with the class "userinfo" will get a hover-card.
	// Note that this elements does need a href attribute which links to
	// a valid profile url
	$('.userinfo').on("mouseover", function(e) {
			var timeNow = new Date().getTime();
			removeAllhoverCards(e,timeNow);
			var hoverCardData = false;
			var hrefAttr = false;
			var targetElement = $(this);

			// get href-attribute
			if(targetElement.is('[href]')) {
				hrefAttr = targetElement.attr('href');
			} else {
				return true;
			}

			// no hover card if the element has the no-hover-card class
			if(targetElement.hasClass('no-hover-card')) {
				return true;
			}

			// no hovercard for anchor links
			if(hrefAttr.substring(0,1) == '#') {
				return true;
			}

			targetElement.attr('data-awaiting-hover-card',timeNow);

			// The serach term is the url 
			var term = hrefAttr;
			// the url to get the contact and template data
			var url = baseurl + "/frio_hovercard";

			// store the title in an other data attribute beause bootstrap
			// popover destroys the title.attribute. We can restore it later
			var title = targetElement.attr("title");
			targetElement.attr({"data-orig-title": title, title: ""});

			// Timeoute until the hover-card does appear
			setTimeout(function(){
				if(targetElement.is(":hover") && parseInt(targetElement.attr('data-awaiting-hover-card'),10) == timeNow) {
					if($('.hovercard').length == 0) {	// no card if there already is one open
						// get an additional data atribute if the card is active
						targetElement.attr('data-hover-card-active',timeNow);
						// get the whole html content of the hover card and
						// push it to the bootstrap popover
						getHoverCardContent(term, url, function(data){
							if(data) {
								targetElement.popover({
									html: true,
									placement: 'auto',
									trigger: 'manual',
									template: '<div class="popover hovercard" data-card-created="' + timeNow + '"><div class="arrow"></div><div class="popover-content hovercard-content"></div></div>',
									content: data
								}).popover('show');
							}
						});
					}
				}
			}, 500);
	}).on("mouseleave", function(e) { // action when mouse leaves the hover-card
		var timeNow = new Date().getTime();
		// copy the original title to the title atribute
		var title = $(this).attr("data-orig-title");
		$(this).attr({"data-orig-title": "", title: title});
		removeAllhoverCards(e,timeNow);
	});



});



// hover cards should be removed very easily, e.g. when any of these events happen
$('body').on("mouseleave touchstart scroll click dblclick mousedown mouseup submit keydown keypress keyup", function(e){
	var timeNow = new Date().getTime();
	removeAllhoverCards(e,timeNow);
});

// removes all hover cards
function removeAllhoverCards(event,priorTo) {
	// don't remove hovercards until after 100ms, so user have time to move the cursor to it (which gives it the dont-remove-card class)
	setTimeout(function(){
		$.each($('.hovercard'),function(){
			var title = $(this).attr("data-orig-title");
			// don't remove card if it was created after removeAllhoverCards() was called
			if($(this).data('card-created') < priorTo) {
				// don't remove it if we're hovering it right now!
				if(!$(this).hasClass('dont-remove-card')) {
					$('[data-hover-card-active="' + $(this).data('card-created') + '"]').removeAttr('data-hover-card-active');
					$(this).popover("hide");
				}
			}
		});
	},100);
}

// if we're hovering a hover card, give it a class, so we don't remove it
$('body').on('mouseover','.hovercard', function(e) {
	$(this).addClass('dont-remove-card');
});
$('body').on('mouseleave','.hovercard', function(e) {
	$(this).removeClass('dont-remove-card');
	$(this).popover("hide");
});

// Ajax request to get json contact data
function getHoverCardData(term, url, actionOnSuccess) {
	var postdata = {
		mode		: 'modal',
		profileurl	: term,
		datatype	: 'json',
	};

	$.ajax({
		url: url,
		data: postdata,
		dataType: "json",
		success: function(data, textStatus, request){
			actionOnSuccess(data, url, request);
		},
		error: function(data) {
			actionOnSuccess(false, data, url);
		}
	});
}
// current time in milliseconds, to send each request to make sure
// we 're not getting 304 response
function timeNow() {
	return new Date().getTime();
}
// Get hover-card template data and the contact-data and transform it with
// the help of jSmart. At the end we have full html content of the hovercard
function getHoverCardContent(term, url, callback) {
	// fetch the raw content of the template
	getHoverCardTemplate(url, function(stpl) {
		var template = unescape(stpl);

		// get the contact data
		getHoverCardData (term, url, function(data) {
			if(typeof template != 'undefined') {
				// get the hover-card variables
				var variables = getHoverCardVariables(data);
				var tpl;

				// use friendicas template delimiters instead of
				// the original one
				jSmart.prototype.left_delimiter = '{{';
				jSmart.prototype.right_delimiter = '}}';

				// create a new jSmart instant with the raw content
				// of the template
				var tpl = new jSmart (template);
				// insert the variables content into the template content
				var HoverCardContent = tpl.fetch(variables);

				callback(HoverCardContent);
			}
		});
	});

// This is interisting. this pice of code ajax request are done asynchron.
// To make it work getHOverCardTemplate() and getHOverCardData have to return it's 
// data (no succes handler for each of this). I leave it here, because it could be useful.
// https://lostechies.com/joshuaflanagan/2011/10/20/coordinating-multiple-ajax-requests-with-jquery-when/
//	$.when(
//		getHoverCardTemplate(url),
//		getHoverCardData (term, url )
//
//	).done(function(template, profile){
//		if(typeof template != 'undefined') {
//			var variables = getHoverCardVariables(profile);
//
//			jSmart.prototype.left_delimiter = '{{';
//			jSmart.prototype.right_delimiter = '}}';
//			var tpl = new jSmart (template);
//			var html = tpl.fetch(variables);
//
//			return html;
//		}
//	});
}

// Ajax request to get the raw template content
function getHoverCardTemplate (url, callback) {
	var postdata = {
		mode: 'modal',
		datatype: 'tpl'
	};

	$.ajax({
		url: url,
		data: postdata,
		success: function(data, textStatus) {
			callback(data);
		}
	});
}

// The Variables used for the template
function getHoverCardVariables(object) {
	var profile = {
			name:		object.name,
			nick:		object.nick,
			addr:		object.addr,
			thumb:		object.thumb,
			url:		object.url,
			location:	object.location,
			gender:		object.gender,
			about:		object.about,
			network:	object.network,
			tags:		object.tags,
			bd:		object.bd,
			account_type:	object.account_type,
			actions:	object.actions
	};

	var variables = { profile:  profile};

	return variables;
}

// This is the html template for the hover-card
// Since we grab the original hovercard.tpl we don't
// need it anymore
function hovercard_template() {
	var tempate = '\
	<div class="basic-content" >\
		<div class="hover-card-details">\
			<div class="hover-card-header left-align">\
				<div class="hover-card-pic left-align">\
					<span class="image-wrapper medium">\
						<a href="{{$profile.url}}" title="{{$profile.name}}"><img href="" class="left-align thumbnail" src="{{$profile.thumb}}"></a>\
					</span>\
				</div>\
				<div class="hover-card-content">\
					<div class="profile-entry-name">\
						<h4 class="left-align1"><a href="{{$profile.url}}">{{$profile.name}}</a></h4>{{if $profile.account_type}}<span>{{$profile.account_type}}</span>{{/if}}\
					</div>\
					<div class="profile-details">\
						<span class="profile-addr">{{$profile.addr}}</span>\
						{{if $profile.network}}<span class="profile-network"> ({{$profile.network}})</span>{{/if}}\
					</div>\
					{{*{{if $profile.about}}<div class="profile-details profile-about">{{$profile.about}}</div>{{/if}}*}}\
\
				</div>\
				<div class="hover-card-actions  right-aligned">\
					{{* here are the differnt actions like privat message, poke, delete and so on *}}\
					{{* @todo we have two different photo menus one for contacts and one for items at the network stream. We currently use the contact photo menu, so the items options are missing We need to move them *}}\
					<div class="hover-card-actions-social">\
						{{if $profile.actions.pm}}<a class="btn btn-labeled btn-primary btn-sm" onclick="addToModal("{{$profile.actions.pm.1}}")" title="{{$profile.actions.pm.0}}"><i class="fa fa-envelope" aria-hidden="true"></i></a>{{/if}}\
						{{if $profile.actions.poke}}<a class="btn btn-labeled btn-primary btn-sm" onclick="addToModal("{{$profile.actions.poke.1}}")" title="{{$profile.actions.poke.0}}"><i class="fa fa-heartbeat" aria-hidden="true"></i></a>{{/if}}\
					</div>\
					<div class="hover-card-actions-connection">\
						{{if $profile.actions.edit}}<a class="btn btn-labeled btn-primary btn-sm" href="{{$profile.actions.edit.1}}" title="{{$profile.actions.edit.0}}"><i class="fa fa-pencil" aria-hidden="true"></i></a>{{/if}}\
						{{if $profile.actions.drop}}<a class="btn btn-labeled btn-primary btn-sm" href="{{$profile.actions.drop.1}}" title="{{$profile.actions.drop.0}}"><i class="fa fa-user-times" aria-hidden="true"></i></a>{{/if}}\
						{{if $profile.actions.follow}}<a class="btn btn-labeled btn-primary btn-sm" href="{{$profile.actions.follow.1}}" title="{{$profile.actions.follow.0}}"><i class="fa fa-user-plus" aria-hidden="true"></i></a>{{/if}}\
					</div>\
				</div>\
			</div>\
\
			<div class="clearfix"></div>\
\
		</div>\
	</div>\
	{{if $profile.tags}}<div class="hover-card-footer">{{$profile.tags}}</div>{{/if}}';
}