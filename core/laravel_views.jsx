import { debounce, merge, pick } from 'lodash';
import { observable } from 'mobx';
import { inject } from 'mobx-react';
import React, { Component } from 'react';
//-
import { create_abspath_url } from '../misc/url.js';


export function asTable(Component)
{
    @inject('app')
    class Table extends Component
    {
        @observable query = {pagesize: 15, q: ''}
        // Please set in your Component, if you wanted to update window.location
        //updateLocation = false

        constructor(props)
        {
            super(props);
            Object.assign(this.state, {
                data: [],
                per_page: 0,
                total: 0,
                from: 0,
                to: 0,
                current_page: 0,
                last_page: 0,
                state: '',
            });
            if (this.defaultQuery)
            {
                merge(this.query, this.defaultQuery);
            }
            if (props.query)
            {
                if (this.getPropsQueryFieldNames)
                {
                    let fields = this.getPropsQueryFieldNames();
                    merge(this.query, pick(props.query, fields));
                }
                else
                {
                    merge(this.query, props.query);
                }
            }
            if (this.updateLocation)
            {
                let qs = new URLSearchParams(location.search);
                for (let key of qs.keys())
                {
                    let val = qs.getAll(key);
                    this.query[key] = val.join(',');
                }
            }

            this.lazyRefresh = debounce(this.refresh, 500);
            this.setQuery = this.setQuery.bind(this);
        }

        getQuery()
        {
            return this.query;
        }

        setQuery(query, refresh)
        {
            merge(this.query, query);
            if (this.updateLocation)
            {
                this.props.app.history.push(create_abspath_url(null,
                        this.query));
            }
            if (refresh !== false)
            {
                this.lazyRefresh();
            }
        }

        async refresh()
        {
            this.setState({state: 'loading'});
            try
            {
                let pager = await this.performRefresh();
                this.setState(pick(pager, keys(this.state)));
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
    }

    return Table;
}
