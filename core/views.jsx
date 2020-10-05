import { debounce, forOwn, isEmpty, isUndefined, merge, pick, uniqueId
       } from 'lodash';
import { observable } from 'mobx';
import { inject, observer, Provider } from 'mobx-react';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
//-
import { blob2bin } from './msgbus.js';
import { create_abspath_url } from '../misc/url.js';


@observer
export class ErrorMessages
{
    @observable info = {};
    @observable warning = {};
    @observable error = {};

    constructor()
    {
        this.cleared_fields = [];
    }

    clear()
    {
        this.info = {};
        this.warning = {};
        this.error = {};
    }

    reset()
    {
        this.cleared_fields = [];
    }

    apply(messages)
    {
        const self = this;
        ['error', 'warning', 'info'].forEach(function(key)
        {
            if (isEmpty(messages[key])) return;
            merge(self[key], messages[key]);
        });
    }

    _renderUl(arr, className)
    {
        if (!isEmpty(arr))
        {
            return (
                <ul role="alert" className={'alert alert-' + className}>
                  {arr.map((x, ii) =>
                      <li key={ii} dangerouslySetInnerHTML={{__html:x}}/>)}
                </ul>)
        }
    }

    has(field)
    {
        return this.error[field] || this.warning[field] || this.info[field];
    }

    render(field)
    {
        const self = this;
        var data = {};
        if (field)
        {
            this.cleared_fields.push(field);
            if (this.error) data.error = this.error[field];
            if (this.warning) data.warning = this.warning[field];
            if (this.info) data.info = this.info[field];
        }
        else
        {
            ['error', 'warning', 'info'].forEach(function(key)
            {
                if (isEmpty(self[key])) return;
                forOwn(
                    self[key],
                    function(arr, field)
                    {
                        if (self.cleared_fields.indexOf(field) !== -1) return;
                        if (!data[key]) data[key] = [];
                        if (field && field !== '_')
                        {
                            arr.forEach(function(message)
                            {
                                data[key].push(field + ': ' + message);
                            });
                        }
                        else
                        {
                            data[key].push(...arr);
                        }
                    });
            });
        }
        return <>
            {this._renderUl(data.error, 'danger')}
            {this._renderUl(data.warning, 'warning')}
            {this._renderUl(data.info, 'info')}
            </>;
    }
}


export function asPage(Component)
{
    @inject('app')
    class Page extends Component
    {
        constructor(props)
        {
            super(props);
            if (!this.state) this.state = {};
            Object.assign(
                    this.state,
                    {
                        state: '',
                    });
            this.errors = new ErrorMessages();
            this.newState = {};

            this.onInputChange = this.onInputChange.bind(this);
            this.onFileInputChange = this.onFileInputChange.bind(this);
            this.onSubmit = this.onSubmit.bind(this);
            this.onCancel = this.onCancel.bind(this);
            this.set = this.set ? this.set.bind(this) : this._set.bind(this);
            this.lazyRefresh = debounce(this.refresh.bind(this), 500);
            if (isUndefined(this.redirectNext))
            {
                this.redirectNext = '/';
            }
            if (isUndefined(this.redirectPrev))
            {
                this.redirectPrev = '/';
            }
        }

        persistState()
        {
            if (isEmpty(this.newState)) return;

            this.setState(this.newState);
            this.newState = {};
        }

        onInputChange(event)
        {
            const target = event.target;
            const value = target.type === 'checkbox' ? target.checked
                    : target.value;
            this.setState({[target.name]: value});
        }

        async onFileInputChange(event)
        {
            const target = event.target;
            var value = '';
            if (target.files[0])
            {
                value = await blob2bin(target.files[0]);
            }
            this.setState({[target.name]: value});
        }

        async onSubmit(event)
        {
            const app = this.props.app;
            if (event) event.preventDefault();
            this.errors.clear();
            this.setState({state: 'loading'});
            try
            {
                const response = await this.performSubmit();
                this.persistState();
                if (response.status >= 500)
                {
                    app.alert("Server Error!");
                }
                else if ([400, 409, 422].includes(response.status))
                {
                    this.setState({state: null});
                    this.errors.apply(await response.json());
                }
                else if (response.status === 403)
                {
                    location.href = create_abspath_url(app.route('login'),
                            {next: location.href});
                }
                else if (this.redirectNext !== null)
                {
                    const qs = new URLSearchParams(location.search);
                    location.href = qs.get('next') || this.redirectNext;
                }
                else
                {
                    this.setState({state: null});
                }
            }
            catch(error)
            {
                this.setState({state: null});
                console.log(error.stack);
                this.props.app.alert(error.message);
            }
        }

        onCancel(event)
        {
            event.preventDefault();
            const qs = new URLSearchParams(location.search);
            this.props.app.history.push(qs.get('prev') || this.redirectPrev);
        }

        async refresh(event)
        {
            const pageURL = location.pathname
                    + (location.search ? location.search : '')
                    + (location.hash ? '#' + location.hash : '');

            if (event) event.preventDefault();

            this.setState({
                state: 'loading',
                prevQuery: 'prev=' + encodeURIComponent(pageURL),
            });
            try
            {
                await this.performRefresh();
                this.persistState();
            }
            catch(error)
            {
                console.log(error.stack);
                this.props.app.alert(error.message);
            }
            finally
            {
                this.setState({state: null});
            }
        }

        setPageMeta(options)
        {
            if (options.title)
            {
                window.title = options.title;
            }
        }

        _set(event)
        {
            event.preventDefault();
            let el = event.target;
            this.setState({[el.name]: el.value});
        }
    }

    return Page;
}


export function asForm(Component)
{
    class Form extends Component
    {
        constructor(props)
        {
            super(props);
            this.id = this.props.id || uniqueId('form_');
            this.onInputChange = this.onInputChange.bind(this);
            this.onFileInputChange = this.onFileInputChange.bind(this);
            if (this.onSubmit)
            {
                this.onSubmit = this.onSubmit.bind(this);
            }
        }

        onInputChange(event)
        {
            const target = event.target;
            const value = target.type === 'checkbox' ? target.checked
                    : target.value;
            this.setState({[target.name]: value});
        }

        async onFileInputChange(event)
        {
            const target = event.target;
            var value = '';
            if (target.files[0])
            {
                value = await blob2bin(target.files[0]);
            }
            this.setState({[target.name]: value});
        }
    }

    return Form;
}


export function asAjaxForm(Component)
{
    @inject('app')
    @asForm
    class AjaxForm extends Component
    {
        constructor(props)
        {
            super(props);
            if (!this.state) this.state = {};
            Object.assign(
                    this.state,
                    {
                        state: '',
                    });
            this.errors = new ErrorMessages();
            this.form = React.createRef();

            this.onCancel = this.onCancel.bind(this);
        }

        async onSubmit(event)
        {
            const app = this.props.app;
            event.preventDefault();
            this.errors.clear();
            this.setState({state: 'loading'});
            try
            {
                const response = await this.performSubmit();
                if (response.status >= 500)
                {
                    app.alert("Server Error!");
                }
                else if ([400, 409, 422].includes(response.status))
                {
                    this.setState({state: null});
                    this.errors.apply(await response.json());
                }
                else if (response.status === 403)
                {
                    location.href = create_abspath_url(app.route('login'),
                            {next: location.href});
                }
                else
                {
                    this.setState({state: null});
                    this.submit(await response.json());
                }
            }
            catch(error)
            {
                this.setState({state: null});
                console.log(error.stack);
                this.props.app.alert(error.message);
            }
        }

        onCancel(event)
        {
            event.preventDefault();
            this.cancel();
        }
    }

    return AjaxForm;
}


function onHideModal()
{
    ReactDOM.unmountComponentAtNode(document.getElementById('js_modal'));
}

export function showModal(Component, props, app)
{
    return new Promise(function(resolve, reject)
    {
        ReactDOM.render(
            <Provider app={app}>
              <Component {...props} onHide={onHideModal} resolve={resolve}
                  reject={reject} show={true}/>
            </Provider>,

            document.getElementById('js_modal'));
    });
}
