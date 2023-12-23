from django.shortcuts import render, redirect


def index(request):
    if request.method == 'GET':

        context = {}

        if 'username' in request.session:
            context['username'] = request.session['username']

        return render(request, 'main/lobby.html', context)
    
    if request.method == 'POST':
        if request.POST.get('username') and request.POST.get('roomname'):
            request.session['username'] = request.POST.get('username')

            return redirect('room', room_name=request.POST.get('roomname'))
        else:
            return render(request, 'main/lobby.html', {'error': True})


def room(request, room_name):
    if room_name and 'username' in request.session:
        return render(request, 'main/room.html', {
            'room_name': room_name,
            'username': request.session['username']
        })
    else:
        return redirect('index')